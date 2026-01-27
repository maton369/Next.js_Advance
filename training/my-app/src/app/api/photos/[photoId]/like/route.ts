import type { NextRequest } from "next/server";

/**
 * Route Handler（API Route）: POST /api/photos/[photoId]/like
 *
 * - App Router では `app/api/.../route.ts` に HTTP メソッド名（GET/POST 等）を export すると、
 *   そのメソッドに対応した API エンドポイントとして動作する。
 *
 * 想定される配置例：
 * - app/api/photos/[photoId]/like/route.ts
 *
 * すると、このファイルは次の URL に対応する：
 * - POST /api/photos/:photoId/like
 *
 * アルゴリズム的な見方（入力→副作用→出力）：
 * 1. クライアント（ブラウザ）から POST リクエストが来る
 * 2. URL から Dynamic Segment（photoId）を抽出して params.photoId に入れる
 * 3. 必要ならリクエスト情報（ヘッダ、Cookie、ボディ）を解析して送信者を特定する
 * 4. 永続化（DB更新など）の副作用処理を行う（「いいね」を保存）
 * 5. JSON レスポンスを返す（クライアントが結果を解釈できるようにする）
 */

/**
 * POST ハンドラ
 *
 * - Next.js が「POST リクエスト」を受けると、この関数が呼ばれる。
 *
 * 引数：
 * - 第1引数（NextRequest）：リクエスト情報（ヘッダ、Cookie、ボディ等）を参照できる
 * - 第2引数（context）：ルートパラメータなどが入る（ここでは params.photoId）
 */
export async function POST(
    /**
     * 第1引数 `_`（未使用）
     *
     * - NextRequest を受け取れるが、このサンプルでは使わないため `_` にしている。
     * - 実運用ではここから以下を読むことが多い：
     *   - Cookie（ログインユーザーの識別）
     *   - Authorization ヘッダ（トークン）
     *   - request.json()（POST ボディ）
     *   - request.ip / request.headers など（監査・レート制限）
     */
    _: NextRequest,

    /**
     * 第2引数：context
     *
     * - `params` は URL の Dynamic Segment に対応する。
     * - /api/photos/123/like に POST が来た場合、params.photoId === "123" になる。
     */
    { params }: { params: { photoId: string } },
) {
    /**
     * いいねされた写真IDのログ出力
     *
     * - これはサーバ側のログに出る（ブラウザのコンソールではない）。
     * - 開発中の動作確認に便利。
     *
     * 注意：
     * - 本番環境ではログ量が増える可能性があるため、
     *   ログレベルやサンプリングを検討することが多い。
     */
    console.log(`photoId ${params.photoId} が「いいね」されました`);

    // 🚧 TODO: 誰から送られたリクエストかを cookie から特定する処理
    /**
     * 送信者特定（認証/認可）の必要性
     *
     * - 「いいね」は “誰が押したか” が重要になるため、
     *   通常はリクエストを送ってきたユーザーIDを特定する必要がある。
     *
     * 典型的アルゴリズム：
     * 1. Cookie（セッションID等）を読む
     * 2. セッションを検証して userId を得る（不正なら 401/403）
     * 3. userId と photoId を組にして「いいね」状態を更新する
     *
     * ※ next/headers の cookies() を使う、あるいは NextRequest から cookies を読む、などの実装方針がある。
     */

    // 🚧 TODO: DBサーバーなどに永続化するための処理
    /**
     * 永続化（DB更新）のイメージ
     *
     * - ここが本体の副作用処理であり、一般的には DB に以下のような変更を加える。
     *
     * 典型的アルゴリズム：
     * 1. photoId の存在確認（存在しないなら 404）
     * 2. userId + photoId の「いいね」レコードが既にあるか確認
     * 3. 無ければ INSERT（いいね追加） / 既にあれば UPDATE または no-op（仕様次第）
     * 4. いいね数を返す、あるいは「成功した」だけ返す
     *
     * 重要：
     * - 二重押下（連打）や同時実行に耐えるように、
     *   UNIQUE 制約（userId, photoId）やトランザクション設計が必要になることが多い。
     */

    /**
     * JSON レスポンスを返す
     *
     * - `Response.json(...)` は JSON を返すためのヘルパー。
     * - ここでは `{ liked: true }` を返し、「処理成功」をクライアントに伝えている。
     *
     * アルゴリズム的には：
     * - 副作用処理の結果を “最小限のステータス” として返す設計。
     *
     * 拡張案：
     * - liked: true/false だけでなく、likeCount や isLiked を返すと UI 更新に使いやすい。
     */
    return Response.json({ liked: true });
}