/**
 * default.tsx（Parallel Routes の “フォールバック” を定義するファイル）
 *
 * これは Next.js App Router の Parallel Routes（並列ルート）で必須になりやすいファイルである。
 *
 * Parallel Routes では、レイアウトに「複数のスロット（例：@modal など）」を用意し、
 * URL に応じてそのスロットへ描画するコンテンツを差し込む。
 *
 * ただし、ある URL ではそのスロットが “何も表示しない” 状態になることがある。
 * そのとき Next.js は「そのスロットに何を描画すればよいか」を判断するために、
 * default.tsx（フォールバック）を要求する。
 *
 * 例（概念）：
 * - app/
 *   - (site)/
 *     - layout.tsx              ← children と @modal の両方を受け取る
 *     - page.tsx
 *     - @modal/
 *       - (.)photos/[id]/page.tsx  ← Intercepting Route でモーダル表示
 *       - default.tsx              ← 何も割り込みが無いときはここが描画される
 *
 * アルゴリズム的な見方（スロット解決）：
 * 1. Next.js は URL を元に「各スロットに何を描画するか」を解決する
 * 2. @modal スロットに該当ルートがあればその page.tsx を採用する
 * 3. 該当ルートが無い（＝モーダル表示しない）場合は default.tsx を採用する
 * 4. layout.tsx 側では {modal} が常に存在する前提で JSX 合成できる
 *
 * つまり default.tsx は「スロットが空のときの埋め草」であり、
 * レイアウト側の合成ロジックを安定させるための部品である。
 */
export default function Page() {
  /**
   * ★: Parallel Routes を使用する際は default.tsx は必須
   *
   * - “モーダルを表示しない状態” のときに、このスロットは何も描画しないのが正しい。
   * - そのため、return null にして「DOM を出さない」実装にしている。
   *
   * なぜ return null でいいのか：
   * - @modal スロットが空のときは UI を増やしたくない（背景ページだけでよい）
   * - しかし “スロットの解決先” としてはコンポーネントが必要
   *
   * アルゴリズム的には：
   * - “スロット未使用” のケースを明示的に定義し、
   *   レイアウト合成が常に成立するようにしている。
   */
  return null;
}