type Props = {
  /**
   * searchParams（URL 検索パラメータ / クエリ文字列）
   *
   * - App Router のページコンポーネントは、URL のクエリ部分（`?key=value`）を
   *   `searchParams` として受け取れる。
   *
   * 例：
   * - /terms?foo=bar
   *   searchParams.foo === "bar"
   *
   * - 同じキーが複数回指定されるケースもあり得るため、値は
   *   `string | string[] | undefined` となる。
   *
   * 例：
   * - /terms?foo=a&foo=b
   *   searchParams.foo === ["a", "b"]
   *
   * - 指定が無ければ undefined。
   */
  searchParams: { [key: string]: string | string[] | undefined };
};

/**
 * 利用規約ページ
 *
 * - このページは `searchParams` を通じて URL クエリを参照できる。
 * - `"use client"` が無い場合、デフォルトで Server Component として扱われることが多い。
 *   その場合でも searchParams は props として渡されるため参照可能。
 *
 * アルゴリズム的な見方（URL → searchParams → 分岐/処理 → 描画）：
 * 1. リクエストURLを解析する（例：/terms?foo=bar）
 * 2. クエリ文字列を key/value 形式にして `searchParams` を構築する
 * 3. Page に props として渡す
 * 4. Page 側で必要なキー（ここでは foo）を安全に取り出して処理する
 * 5. JSX を返して HTML を生成する
 */
export default function Page(props: Props) {
  /**
   * searchParams.foo の取り出し
   *
   * - `searchParams.foo` の型は `string | string[] | undefined` のいずれか。
   * - そのままでは「文字列として扱って良いか」が不明なので、型ガード（typeof）で絞り込む。
   *
   * ここで typeof === "string" を使う理由：
   * - "string" のときだけ、文字列メソッド（trim, toLowerCase 等）や
   *   文字列前提のロジックを安全に適用できる。
   *
   * アルゴリズム的な見方：
   * - 入力：searchParams.foo（不確定型）
   * - 判定：型ガードで string の場合のみ通す
   * - 出力：string として安全に利用できる値
   */
  if (typeof props.searchParams.foo === "string") {
    /**
     * searchParams.foo を使用する処理（例）
     *
     * 典型的な用途：
     * - 参照元の識別：/terms?foo=campaignA のように流入元で表示を変える
     * - UI状態：/terms?foo=highlight のように特定セクションを強調する
     * - デバッグ：/terms?foo=1 で一時的な挙動を切り替える（本番では慎重に）
     *
     * 注意点：
     * - クエリはユーザー入力なので、信頼できない値として扱う（バリデーションが必要）。
     * - この例では処理内容が省略されているが、実際はここで正規化（trim等）や
     *   許可リストチェックを行うのが安全。
     */
    // 例：const foo = props.searchParams.foo.trim();
    // 例：if (foo === "campaignA") { ... }
  }

  return (
    <div>
      {/**
       * ページ見出し
       *
       * - 利用規約は基本的に静的表示になりやすいが、
       *   searchParams を使うと「特定条件で通知バナーを出す」などの
       *   軽い分岐表示も可能になる。
       */}
      <h1>利用規約</h1>
    </div>
  );
}