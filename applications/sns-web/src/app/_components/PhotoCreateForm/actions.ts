"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { postPhotos } from "@/services/postPhotos";

/**
 * Payload（postPhotoAction が受け取る入力）
 *
 * imageUrl:
 * - すでにアップロード済みの画像URL（S3/互換ストレージ上の参照先）
 * - ここで重要なのは「バイナリ（Blob）ではなく URL」になっている点。
 *   ＝画像アップロード（重い処理）はクライアント側で完結し、
 *     サーバ側では “投稿レコードの永続化” に集中できる。
 *
 * title / categoryId / description:
 * - 投稿に付随するメタデータ。
 * - DB保存のための “ドメイン入力” として扱う。
 *
 * アルゴリズム的には：
 * - UI入力（フォーム）を、永続化可能な構造（Payload）へ整形したもの。
 */
type Payload = {
    imageUrl: string;
    title: string;
    categoryId: string;
    description: string;
};

/**
 * postPhotoAction（写真投稿の Server Action）
 *
 * 目的：
 * - ログインユーザーを特定（認証）
 * - 投稿データをバックエンド（Web APIサーバ）へ送信して永続化
 * - 投稿一覧などのキャッシュを破棄（On-demand Revalidation）
 * - 成功したら投稿詳細ページへ redirect して、UXとして “投稿完了の着地点” を固定する
 *
 * この関数が "use server" で宣言されているため：
 * - クライアントバンドルに含まれず、サーバ側でのみ実行される。
 * - DBや秘密情報（セッション、環境変数など）に安全にアクセスできる。
 *
 * アルゴリズム（投稿の保存パイプライン）：
 * 1. セッション取得 → 認証（誰の投稿かを確定）
 * 2. バックエンドAPIへ postPhotos で保存要求
 * 3. 保存成功なら “一覧のキャッシュ” を revalidateTag で無効化
 * 4. 保存された photoId を取り出す
 * 5. redirect(`/photos/${photoId}`) で詳細へ遷移して完了
 *
 * 重要な設計ポイント：
 * - userId を payload から受け取らず、必ず session から決める
 *   → クライアントが userId を偽装できない（なりすまし防止）。
 * - revalidateTag で “保存後の一覧反映” をサーバ責務として完結する
 *   → クライアントで router.refresh/push を多用しなくて済む。
 */
export async function postPhotoAction(payload: Payload) {
    /**
     * 【5】誰から送られたリクエストかを特定する（認証）
     *
     * - getServerSession() でログインユーザーを取得する。
     * - 未ログインなら “Unauthorized” を返し、以降の保存処理は実行しない。
     *
     * アルゴリズム的には：
     * - “入力 payload” に userId を含めない代わりに、
     *   “ルート（認証コンテキスト）” から userId を注入する工程。
     */
    const session = await getServerSession();
    if (!session) {
        /**
         * ここでは redirect ではなく “戻り値でエラー” を返している。
         *
         * - 呼び出し側（Client Component）がこの戻り値を見て
         *   UI上のエラー表示やログイン導線へ分岐できる余地を残している設計。
         *
         * ※ 要件次第では signIn へ redirect する設計もあり得る。
         */
        return { message: "Unauthorized" };
    }

    /**
     * photoId（保存に成功した投稿のID）
     *
     * - try の中で保存結果から取り出し、
     *   最後に redirect のパスとして利用する。
     *
     * なぜ let で外に置くのか：
     * - try/catch のスコープをまたいで使う必要があるため。
     * - ただし “成功したときだけ redirect” の構造なので、
     *   実際には try の中で redirect しても良い（設計の好み）。
     */
    let photoId = "";

    try {
        /**
         * 【6】投稿者 ID と情報をまとめて Web API サーバーに送信（永続化）
         *
         * postPhotos:
         * - バックエンドAPIへ “投稿を作成する” リクエストを送るサービス関数。
         * - ここでは userId を session から確定して渡す。
         *
         * ここが “データ保存の本体”：
         * - imageUrl（画像は既にアップロード済み）
         * - title/categoryId/description（メタデータ）
         * - userId（投稿者の主体）
         * を揃えてバックエンドへ送ることで、DBに投稿レコードが生成される。
         *
         * アルゴリズム的には：
         * - (入力) payload + session.user.id
         * - (変換) postPhotos による永続化
         * - (出力) 作成された photo（id を含む）
         */
        const { photo } = await postPhotos({
            userId: session.user.id,
            imageUrl: payload.imageUrl,
            title: payload.title,
            categoryId: payload.categoryId,
            description: payload.description,
        });

        /**
         * ★ On-demand Revalidation（キャッシュの整合性回復）
         *
         * revalidateTag:
         * - Next.js のデータキャッシュに対して “このタグの付いた取得結果は古い” と宣言する。
         * - 次回レンダリング時に再取得され、投稿一覧が最新化される。
         *
         * タグ設計：
         * - `photos?authorId=${session.user.id}`
         *   → “このユーザーの写真一覧” を表すタグ。
         *
         * これにより、クライアント側で router.refresh() を強制しなくても
         * “保存後に一覧が更新される” ループが成立する（構成次第）。
         */
        revalidateTag(`photos?authorId=${session.user.id}`);

        /**
         * redirect 先で使うために photoId を保持
         *
         * - 作成した投稿の詳細へ飛ぶので、id が必要。
         */
        photoId = photo.id;
    } catch (err) {
        /**
         * 例外時の処理
         *
         * - ここでの例外は主に：
         *   - バックエンドAPIのエラー（500/503 など）
         *   - ネットワークエラー
         *   - postPhotos 内の変換/パース失敗
         *   などが想定される。
         *
         * - “Internal Server Error” を返すことで呼び出し側が UI で通知できる。
         *
         * 注意：
         * - 現状は例外内容を握りつぶしている。
         *   デバッグ性を上げるならログ出力やエラー種別分岐を検討できる。
         */
        return { message: "Internal Server Error" };
    }

    /**
     * 【9】★ 投稿の詳細画面へリダイレクト（成功時の着地点）
     *
     * redirect は Server Action / Server Component で使える “サーバサイド遷移”。
     * - クライアントで router.push を呼ぶのではなく、
     *   サーバが “次に表示すべきページ” を決めて遷移させる。
     *
     * UX的メリット：
     * - 投稿完了後に詳細画面へ確実に着地する
     * - ルーティングの責務がサーバ側に寄るため、クライアント実装が簡潔になる
     *
     * アルゴリズム的には：
     * - “保存により得たID” を “次の画面（URL）” に変換する最終工程。
     */
    redirect(`/photos/${photoId}`);
}