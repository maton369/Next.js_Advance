type Props = {
  /**
   * params（パスパラメータ）
   *
   * - App Router の Dynamic Route（例：`app/categories/[categoryName]/page.tsx`）では、
   *   URL のパスの一部（`[categoryName]`）が params として渡される。
   *
   * 例：
   * - /categories/flower にアクセスすると params.categoryName === "flower"
   * - /categories/animal にアクセスすると params.categoryName === "animal"
   *
   * アルゴリズム的には：
   * - 「URL のパス」→「キー付きの値（params）」へ変換して、ページコンポーネントに渡す。
   * - これにより “ルートが持つ状態” を関数引数として受け取れるようになる。
   */
  params: { categoryName: string };

  /**
   * searchParams（URL 検索パラメータ / クエリ文字列）
   *
   * - URL の `?key=value` 形式の部分を参照できる。
   * - Next.js App Router では、ページコンポーネントに searchParams が props として渡される。
   *
   * 例：
   * - /categories/flower?page=3 → searchParams.page === "3"
   * - /categories/flower?page=1&page=2 のように同キーが複数あり得るため、string[] になる可能性がある
   * - 指定されていなければ undefined
   *
   * 型が `{ [key: string]: string | string[] | undefined }` なのは、
   * - クエリ文字列は任意のキーが飛んでくる可能性がある（動的）ため
   * - さらに、キーの値が「単一」か「複数」か「未指定」かが状況で変わるため
   */
  searchParams: { [key: string]: string | string[] | undefined };
};

// ★: props からパスパラメーター、URL 検索パラメーターが参照できる
/**
 * /categories/[categoryName] ページ（カテゴリ別一覧画面）
 *
 * - ここは Dynamic Route のページで、URL の一部（categoryName）と
 *   検索パラメータ（page など）を受け取って表示内容を変える“分岐ページ”である。
 *
 * 入力（URL）→ 出力（画面）の変換という観点でのアルゴリズム：
 * 1. URL のパス `/categories/<categoryName>` から params.categoryName を取り出す
 * 2. URL のクエリ `?page=<n>` から searchParams.page を取り出す
 * 3. 取り出した値を安全に正規化（型の揺れ・未指定を吸収）して表示用の値にする
 * 4. 画面に埋め込んでレンダリングする
 */
export default function Page({ params, searchParams }: Props) {
  /**
   * page（ページ番号）の取り出しと正規化
   *
   * searchParams.page は型上 `string | string[] | undefined` になり得るため、
   * そのままでは「表示用のページ番号」として扱いにくい。
   *
   * ここでは以下のルールで正規化している：
   * - string の場合：そのまま使う（例："3"）
   * - string[] の場合：想定外（同キー複数）なのでここでは "1" 扱いに落とす
   * - undefined の場合：未指定なので "1" をデフォルトにする
   *
   * ※ 現状は「string[] を無視して 1 にする」実装だが、
   *   要件次第では「先頭要素を採用する」等の方針もあり得る。
   */
  const page = typeof searchParams.page === "string" ? searchParams.page : "1";

  return (
    <div>
      {/**
       * h1：このページが「カテゴリ別一覧画面」であることを示す見出し
       */}
      <h1>カテゴリー別一覧画面</h1>

      {/**
       * params.categoryName の表示
       *
       * - URL のパスから抽出された categoryName をそのまま表示している。
       * - 実運用では、この categoryName を使って API へ問い合わせたり、
       *   DB から該当カテゴリのデータを取得して一覧表示する、という流れが一般的。
       */}
      <h2>カテゴリー「{params.categoryName}」</h2>

      {/**
       * page の表示
       *
       * - クエリ文字列で指定されたページ番号を表示する。
       * - 実運用では、この page を使ってページネーション（offset/limit 等）を計算し、
       *   取得するデータ範囲を変える、という用途になる。
       */}
      <p>ページ番号：「{page}」</p>
    </div>
  );
}