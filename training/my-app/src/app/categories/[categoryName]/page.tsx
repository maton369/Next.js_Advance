"use client";

import { useRouter } from "next/navigation";

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
 * 追加要件：useRouter を追加し、router.push する
 * - App Router で `useRouter()` はクライアントコンポーネント専用のフックである。
 * - そのため、このファイル先頭に `"use client";` を付けて「クライアント側で動く」ことを宣言する。
 *
 * アルゴリズム的な見方：
 * - URL から params/searchParams を受け取り表示する（入力→表示）
 * - さらに、ユーザー操作（ボタンクリック）をトリガに router.push で URL を更新し、
 *   別のルートへ遷移させる（入力→状態遷移）
 */
export default function Page({ params, searchParams }: Props) {
  /**
   * useRouter（App Router 版）
   *
   * - `next/navigation` の useRouter は、クライアント側でルート遷移を行うための API を提供する。
   * - router.push("/path") を呼ぶと、ブラウザのフルリロードなしで内部遷移が走り、
   *   Next.js が必要な差分（page 部分）を更新する。
   */
  const router = useRouter();

  /**
   * page（ページ番号）の取り出しと正規化
   *
   * searchParams.page は型上 `string | string[] | undefined` になり得るため、
   * そのままでは「表示用のページ番号」として扱いにくい。
   *
   * ここでは以下のルールで正規化している：
   * - string の場合：そのまま使う（例："3"）
   * - string[] / undefined の場合：ここでは "1" をデフォルトにする
   */
  const page = typeof searchParams.page === "string" ? searchParams.page : "1";

  /**
   * ページ番号を 1 つ進める（例：ページネーションの「次へ」）
   *
   * - router.push を使って URL のクエリ（?page=...）を更新する。
   * - URL を状態として扱うため、
   *   - リロードしても同じページ番号に戻れる
   *   - URL を共有/ブックマークできる
   * という利点がある。
   *
   * 注意：
   * - page は string なので、数値として扱う場合は Number(...) で変換してから演算する。
   * - 不正値が入る可能性もあるので、最低限 1 以上に丸めるなどの防御もあり得る。
   */
  const goNextPage = () => {
    const current = Number(page);
    const next = Number.isFinite(current) && current >= 1 ? current + 1 : 2;

    // 現在のカテゴリ（Dynamic Segment）を保持しつつ、クエリだけを更新して遷移する。
    // 例：/categories/flower?page=1 → /categories/flower?page=2
    router.push(`/categories/${params.categoryName}?page=${next}`);
  };

  /**
   * カテゴリー一覧に戻る
   *
   * - Link を使わずに router.push で戻す例。
   * - UI からの明示的な操作で遷移させたい場合に使う。
   */
  const goCategoriesIndex = () => {
    router.push("/categories");
  };

  return (
    <div>
      <h1>カテゴリー別一覧画面</h1>

      <h2>カテゴリー「{params.categoryName}」</h2>

      <p>ページ番号：「{page}」</p>

      {/**
       * router.push を発火させるためのボタン例
       *
       * - Link は「宣言的な遷移（ここに行く）」に向く。
       * - router.push は「命令的な遷移（このタイミングでここに行け）」に向く。
       *   例：入力バリデーション後に遷移、API 成功後に遷移、ページネーション等。
       */}
      <button type="button" onClick={goNextPage}>
        次のページへ
      </button>

      <button type="button" onClick={goCategoriesIndex}>
        カテゴリー一覧に戻る
      </button>
    </div>
  );
}