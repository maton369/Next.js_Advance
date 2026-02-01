import { revalidateTag } from "next/cache";
import { getServerSession } from "@/lib/auth";
import { postPhotos } from "@/services/postPhotos";
import type { NextRequest } from "next/server";

/**
 * POST（/api/photos などの Route Handler を想定）
 *
 * 役割：
 * - クライアント（ブラウザ）から送られてきた「写真投稿リクエスト」を受け取る
 * - 認証済みユーザーかを確認し、投稿者IDを確定する
 * - 受け取った投稿内容（imageUrl/title/categoryId/description）を Web API サーバーへ転送して永続化する
 * - 永続化後にキャッシュを無効化（revalidateTag）して、一覧表示が最新化されるようにする
 * - 成功/失敗の結果を JSON レスポンスとして返す
 *
 * 重要な性質：
 * - これは Next.js の Route Handler（サーバ側で実行される）である。
 * - クライアントからは `fetch("/api/photos", { method: "POST", body: ... })` のように呼ばれる想定。
 *
 * アルゴリズム的な見方（入力→認証→変換→永続化→キャッシュ無効化→出力）：
 * 1. リクエストを受け取る（req）
 * 2. セッションを取得し、送信者が認証済みか判定する
 * 3. req.json() で投稿内容を取り出す
 * 4. userId（セッション）と投稿内容（body）をまとめて postPhotos に渡す
 * 5. 保存が成功したら revalidateTag で関連キャッシュを無効化する
 * 6. 作成された photo を 201 で返す
 * 7. エラー時は 500 を返す（認証失敗は 401）
 */
export async function POST(req: NextRequest) {
    /**
     * 【5】誰から送られたリクエストかを特定する（認証）
     *
     * getServerSession():
     * - NextAuth のセッション情報をサーバ側で取得する関数（想定）。
     * - これにより “リクエスト送信者がログイン済みか” を判定できる。
     *
     * なぜ最初にやるか：
     * - 破壊的/書き込み系 API（投稿・削除など）は、必ず認証確認を入口に置くべき。
     * - body を読む前に弾けば、無駄な処理も減る。
     *
     * アルゴリズム的には：
     * - “アクセス制御のゲート” を最初に置いて、未認証を早期リターンする。
     */
    const session = await getServerSession();
    if (!session) {
        /**
         * 401 Unauthorized を返す
         *
         * - JSON でメッセージを返し、クライアント側が
         *   “ログインを促す” などの UI に切り替えられるようにする。
         */
        return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    /**
     * try/catch：
     * - 投稿処理は外部通信（Web API サーバー）や JSON パース等で失敗し得る。
     * - 失敗した場合でも API が落ちず、HTTP 500 を返してクライアントに通知できるようにする。
     */
    try {
        /**
         * 【6】投稿情報をリクエストボディから取得
         *
         * req.json():
         * - リクエストボディを JSON としてパースする。
         * - ここでは body に imageUrl/title/categoryId/description が入っている前提。
         *
         * 注意：
         * - 実運用では、バリデーション（必須チェック・型チェック・長さ制限など）を
         *   ここで行うのが一般的（Zod 等）。
         */
        const body = await req.json();

        /**
         * 【6】投稿者ID（session.user.id）と投稿内容をまとめて Web API サーバーに送信
         *
         * postPhotos():
         * - Next.js のサーバから、別の Web API（バックエンド）へ投稿作成を依頼するサービス関数。
         * - 結果として `{ photo }` を返す想定。
         *
         * 重要：
         * - userId はクライアントから受け取らず、セッションから確定させている点が正しい。
         *   （クライアント提供の userId は簡単に偽装できるため）
         *
         * アルゴリズム的には：
         * - “クライアント入力（body）” に “信頼できる主体情報（userId）” を付与して、
         *   永続化APIへ変換・転送する工程。
         */
        const { photo } = await postPhotos({
            userId: session.user.id,
            imageUrl: body.imageUrl,
            title: body.title,
            categoryId: body.categoryId,
            description: body.description,
        });

        /**
         * revalidateTag（キャッシュ無効化）
         *
         * 意図：
         * - 投稿作成後、一覧ページ等で “投稿が反映されない” のを防ぐため、
         *   データ取得側で付与している tag を指定してキャッシュを破棄する。
         *
         * ここでは：
         * - `photos?authorId=${session.user.id}` という tag を無効化している。
         *
         * 想定される設計：
         * - getPhotos({ authorId }) の fetch に `{ next: { tags: [...] } }` を付けている
         * - その tag を revalidateTag で無効化すると、次のリクエストで最新が再取得される
         *
         * アルゴリズム的には：
         * - “データが更新された” という事実をキャッシュ層へ伝え、
         *   “古い計算結果（古い一覧レスポンス）” を捨てて再計算（再フェッチ）させる。
         */
        revalidateTag(`photos?authorId=${session.user.id}`);

        /**
         * 【9】保存結果を Client Component に返す（成功）
         *
         * - 201 Created を返し、作成された photo を返却する。
         * - クライアント側はこれを受けて
         *   - モーダルを閉じる
         *   - “投稿完了” を表示する
         *   - 楽観的に一覧へ追加する
         *   などの UI を構築できる。
         */
        return Response.json({ photo }, { status: 201 });
    } catch (err) {
        /**
         * 【9】保存結果を Client Component に返す（失敗）
         *
         * - エラー内容を詳細に返すかどうかは要件次第。
         * - ここでは汎用的に 500 を返している。
         *
         * 改善余地：
         * - バリデーションエラーなら 400
         * - 認可エラーなら 403
         * - 外部APIが落ちているなら 502/503
         * など、原因に応じてステータスを分けるとクライアントUXが良くなる。
         */
        return Response.json({ message: "Internal Server Error" }, { status: 500 });
    }
}