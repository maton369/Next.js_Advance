/**
 * NotFound ページ（App Router の 404 表示）
 *
 * - Next.js App Router では、特定のルート配下に `not-found.tsx`（または `NotFound` コンポーネント）を置くと、
 *   そのルートで「見つからない（404）」扱いになったときに表示される UI を定義できる。
 *
 * 例（配置のイメージ）：
 * - app/not-found.tsx                 → アプリ全体の 404 を担当
 * - app/categories/not-found.tsx      → /categories 配下の 404 を担当（ネストした 404）
 * - app/photos/[id]/not-found.tsx     → 写真詳細配下の 404 を担当（より局所的）
 *
 * どの not-found が使われるか（アルゴリズム的な見方）：
 * 1. ユーザーがある URL にアクセスする
 * 2. Next.js がルート解決（route tree の探索）を行う
 * 3. そのルートで「該当データが存在しない」などの理由で 404 にしたい場合、
 *    `notFound()`（next/navigation）などの仕組みで “Not Found 状態” を発火させる
 * 4. Next.js が「最も近い not-found 定義」を探索して、その UI を表示する
 *
 * 重要：
 * - not-found は「見つからないページ」だけでなく、
 *   “URL は存在するが、指定された ID のデータが存在しない” といったケースにも使うのが典型。
 *
 * 例：
 * - /photos/9999 にアクセスしたが、写真ID=9999 が DB に存在しない
 *   → その時点で notFound() を呼び、not-found UI を出す
 *
 * async になっている理由（現状では不要だが書ける）：
 * - このコンポーネント自体は非同期処理をしていないので async は必須ではない。
 * - ただし、将来「ログ送信」「翻訳データの取得」などを行う場合に async にしたくなる可能性はある。
 * - 一方で、単純な NotFound UI なら sync のままの方が意図が明確。
 */
export default async function NotFound() {
  /**
   * 404 表示内容
   *
   * - ここでは最小限の表示として "Not Found" のみを返している。
   * - 実運用では、以下を追加することが多い：
   *   - トップへ戻るリンク
   *   - 検索ボックス
   *   - 何が見つからなかったかの文言（例：指定の写真が存在しません）
   *
   * アルゴリズム的には：
   * - Not Found 状態が発火した際に、この JSX が返され、404 用の UI としてレンダリングされる。
   */
  return <div>Not Found</div>;
}