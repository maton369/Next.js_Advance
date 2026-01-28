import { handleFailed, handleSucceed, path } from "../";
import type { Category } from "../type";

/**
 * GetCategoriesResponse（カテゴリ一覧APIのレスポンス型）
 *
 * - `getCategories()` が返すデータ構造を TypeScript の型として定義している。
 * - ここでの目的は「フロントが期待する JSON の形」を明確にし、
 *   利用側（ページ/コンポーネント）が型安全に扱えるようにすること。
 *
 * categories の要素型：
 * - `(Omit<Category, "photos"> & { totalPhotoCount: number })[]`
 *
 * これは次の意味を持つ：
 * 1) `Category` 型から `photos` プロパティだけを取り除く（Omit）
 *    - 一覧APIでは “カテゴリに属する写真の配列” を丸ごと返す必要が無い（重い）ため省く設計。
 * 2) 代わりに `totalPhotoCount: number` を付け足す
 *    - カテゴリに何枚写真があるか、集計値として返す（軽量でUIに有用）。
 *
 * アルゴリズム的な見方（レスポンス設計）：
 * - “詳細データ（photos 配列）” を返す代わりに
 * - “集約情報（totalPhotoCount）” を返すことで、
 *   ネットワーク転送量と UI 側の処理コストを下げる、という最適化である。
 */
export type GetCategoriesResponse = {
    categories: (Omit<Category, "photos"> & { totalPhotoCount: number })[];
};

/**
 * getCategories（カテゴリ一覧取得サービス関数）
 *
 * - UI（ページ/コンポーネント）から直接 fetch を書くのではなく、
 *   “サービス層” として API 呼び出しを1箇所に集約している。
 *
 * 役割：
 * - /api/categories にリクエストを送り、成功時は JSON を返し、失敗時は共通エラー処理に流す。
 *
 * アルゴリズム的な見方（リクエスト→成功/失敗の分岐）：
 * 1. path(`/api/categories`) でリクエスト先URLを生成する
 * 2. fetch(...) で HTTP リクエストを送る
 * 3. 成功したら handleSucceed でレスポンスをパース/検証して GetCategoriesResponse を返す
 * 4. 失敗したら catch で handleFailed に流して統一的にエラーを扱う
 *
 * ポイント：
 * - 成功系（then）と失敗系（catch）を “共通関数” に寄せているため、
 *   すべてのAPI呼び出しで挙動を揃えやすい。
 */
export async function getCategories(): Promise<GetCategoriesResponse> {
    /**
     * fetch(path(`/api/categories`))
     *
     * - `path` は “APIのベースURL” や “環境差（開発/本番）” を吸収して、
     *   絶対URL/相対URLを組み立てるユーティリティである可能性が高い。
     *
     * 例（想定される挙動）：
     * - 開発環境では http://localhost:3000/api/categories
     * - 本番環境では https://example.com/api/categories
     * のように環境変数等を使って切り替える。
     *
     * ここで `path` を噛ませることで、
     * - 呼び出し側が URL を直書きしない
     * - URLの組み立て規則を一元化できる
     * というメリットがある。
     */
    return fetch(path(`/api/categories`))
        /**
         * handleSucceed（成功時の共通処理）
         *
         * - レスポンスを JSON に変換する
         * - HTTP ステータスがエラーなら例外を投げる
         * - 型に合う形に整形/バリデーションする
         * などをまとめて担当する関数である可能性が高い。
         *
         * アルゴリズム的には：
         * - Response → GetCategoriesResponse への “変換器（decoder）” の役割。
         */
        .then(handleSucceed)

        /**
         * handleFailed（失敗時の共通処理）
         *
         * - ネットワークエラー、タイムアウト、handleSucceed 内で投げられた例外など、
         *   Promise が reject されたケースをここで受け取る。
         *
         * よくある役割：
         * - エラーログを残す
         * - UI 向けのエラー形式に変換する
         * - デフォルト値を返す/再スローする
         *
         * アルゴリズム的には：
         * - “失敗の正規化（normalize error）” を行い、呼び出し側の例外処理を簡単にする。
         */
        .catch(handleFailed);
}