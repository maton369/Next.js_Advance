import { handleFailed, handleSucceed, path } from "../";
import type { Photo } from "../type";

/**
 * getPhotos（写真一覧取得サービス関数）
 *
 * - UI（ページ/コンポーネント）側に fetch の詳細を書かず、
 *   “サービス層” として API 呼び出しを集約するための関数。
 *
 * この関数の特徴：
 * - `authorId` をオプション引数として受け取り、
 *   指定されていれば「特定ユーザーの投稿写真だけ」を返す。
 * - 指定されていなければ「全写真」を返す（API の仕様に依存）。
 *
 * アルゴリズム的な見方（クエリ構築→取得→成功/失敗の正規化）：
 * 1. 入力（authorId）を受け取る
 * 2. URLSearchParams でクエリ文字列を構築する（必要なら authorId を付与）
 * 3. host + path + query を連結して API URL を確定する
 * 4. fetch でリクエストを送り、handleSucceed で JSON へ変換する
 * 5. エラーは handleFailed でログ/正規化して上位へ伝播する
 */
export function getPhotos({
    authorId,
}: {
    /**
     * authorId（投稿者ID）
     *
     * - 指定すると `/api/photos?authorId=<id>` のように条件付き取得になる。
     * - 未指定なら `/api/photos`（全件取得）になる想定。
     *
     * 注意：
     * - authorId の型は string としているため、数値IDなら呼び出し側で文字列化して渡す前提。
     */
    authorId?: string;
}): Promise<{ photos: Photo[] }> {
    /**
     * searchParams（クエリ文字列の構築）
     *
     * - URLSearchParams は `{ key: value }` の形から
     *   `key=value&...` という URL のクエリ文字列を生成する標準API。
     *
     * ここでの書き方：
     * - `{ ...(authorId && { authorId }) }` により、
     *   authorId が truthy のときだけ `{ authorId: authorId }` を展開して追加する。
     * - authorId が undefined（未指定）なら `{}` になり、何も追加されない。
     *
     * つまり：
     * - authorId がある → searchParams は `authorId=xxx`
     * - authorId がない → searchParams は空（""）
     *
     * アルゴリズム的には：
     * - “入力（authorId）に応じて、URL に含める条件を決める” 分岐処理である。
     */
    const searchParams = new URLSearchParams({
        ...(authorId && { authorId }),
    });

    /**
     * fetch の実行
     *
     * - path(`/api/photos?${searchParams}`) で API の完全URLを作り、fetch で GET する。
     * - searchParams は文字列化されるため、テンプレート文字列にそのまま埋め込める。
     *
     * URL の具体例：
     * - authorId がある場合：
     *   /api/photos?authorId=123
     *
     * - authorId がない場合：
     *   /api/photos?
     *   となり得る（末尾に "?" だけ残る点は注意）。
     *
     * 実運用でよりきれいにしたい場合：
     * - `searchParams.toString()` が空なら `?` を付けない、という分岐にすることが多い。
     *
     * アルゴリズム的には：
     * - “URL を確定” → “HTTP リクエスト” → “レスポンス処理” の直列パイプライン。
     */
    return fetch(path(`/api/photos?${searchParams}`))
        /**
         * handleSucceed（成功時の共通処理）
         *
         * - Response を JSON に変換し、HTTP エラー（res.ok=false）を例外化する役割を持つ想定。
         * - 成功時は `{ photos: Photo[] }` の形のデータが返る前提。
         *
         * これにより呼び出し側は
         * - “成功したらデータが返る”
         * - “失敗したら catch に入る”
         * の単純なモデルで扱える。
         */
        .then(handleSucceed)

        /**
         * handleFailed（失敗時の共通処理）
         *
         * - ネットワークエラー、JSON パースエラー、HTTP エラー（FetchError）などを受け取り、
         *   必要ならログを出してから再スローする想定。
         *
         * “失敗を握りつぶさず伝播する” のがポイントで、
         * - 上位（ページ側）は notFound() / error.tsx / UI表示などで適切に処理できる。
         */
        .catch(handleFailed);
}