import Link from "next/link";

/**
 * /categories ページ（カテゴリー一覧画面）
 *
 * - App Router では、`app/categories/page.tsx` に置かれたコンポーネントが
 *   ルート `/categories` に対応するページになる。
 *
 * このページの役割（アルゴリズム的な見方）：
 * - 「カテゴリ名（categoryName）」の候補をユーザーに提示する。
 * - ユーザーが1つ選ぶ（クリックする）と、次の詳細ページ
 *   `/categories/[categoryName]` に遷移させる。
 * - つまり、一覧（index）→ 詳細（dynamic route）という“画面遷移の分岐点”を作るページである。
 */
export default function Page() {
  return (
    <div>
      {/**
       * h1 はページの主見出し。
       * - アクセシビリティ上も「このページが何か」を示す重要な要素。
       */}
      <h1>カテゴリー一覧画面</h1>

      {/**
       * <ul> / <li> は「カテゴリーの選択肢が複数ある」ことを意味的に表せる。
       * - UI 的にも “メニュー一覧” として自然な構造になる。
       */}
      <ul>
        <li>
          {/**
           * ★: Route の /categories/[categoryName] に遷移する
           *
           * - `href="/categories/flower"` は、Dynamic Route のパラメータ部分
           *   `[categoryName]` に `flower` を入れた URL を指す。
           *
           * ルーティングの対応関係（App Router）：
           * - もし `app/categories/[categoryName]/page.tsx` が存在すれば、
           *   そのページがこの遷移先として描画される。
           *
           * アルゴリズム的には：
           * - ここで “categoryName = flower” という入力（パラメータ）を URL として確定させ、
           *   次ページ側でその値を元に表示内容を分岐させる、というデータ受け渡しの役割を担う。
           */}
          <Link href="/categories/flower">花</Link>
        </li>

        <li>
          {/**
           * `animal` も同様に、Dynamic Route のパラメータに渡す値。
           * - 一覧ページは「リンクを列挙するだけ」で、詳細のロジックは
           *   `/categories/[categoryName]` 側に寄せられる設計になる。
           */}
          <Link href="/categories/animal">動物</Link>
        </li>

        <li>
          {/**
           * `landscape` も同様。
           * - URL を “状態（どのカテゴリか）” として扱うことで、
           *   リロードしても同じカテゴリが表示できる、共有できる、ブックマークできる、という利点がある。
           */}
          <Link href="/categories/landscape">風景</Link>
        </li>
      </ul>
    </div>
  );
}