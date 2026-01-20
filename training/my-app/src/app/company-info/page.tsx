import { cookies } from "next/headers";

/**
 * Page（企業概要ページ）
 *
 * - App Router では `page.tsx` の default export がルートのページコンポーネントになる。
 * - このファイルには `"use client"` が無いため、デフォルトで Server Component として扱われる。
 *
 * 重要ポイント：
 * - `cookies()`（next/headers）は **サーバ側専用API** であり、リクエストに含まれる Cookie を参照するために使う。
 * - つまり、このページは「ユーザーのリクエストコンテキスト（Cookie）」に依存した処理を行える。
 * - Cookie の値によって表示を切り替える（ログイン状態、ABテスト、言語設定など）用途でよく使われる。
 *
 * アルゴリズム的な見方（リクエスト → Cookie 取得 → 表示）：
 * 1. ブラウザからリクエストが来る（Cookie ヘッダが付くことがある）
 * 2. サーバ上で Page 関数が実行される
 * 3. `cookies()` を呼び出し、リクエストに含まれる Cookie の集合（CookieStore）を取得する
 * 4. 取得した Cookie を元に、必要なら分岐やデータ取得を行う
 * 5. JSX を返して HTML を生成し、レスポンスとして返す
 */
export default function Page() {
  /**
   * cookieStore（CookieStore）
   *
   * - `cookies()` は “このリクエストに含まれる Cookie” を読み取るための関数。
   * - 戻り値は CookieStore で、Cookie を列挙したり、特定キーを取得したりできる（APIに沿って利用する）。
   *
   * 注意：
   * - これは「サーバでの実行時」にのみ意味がある。
   * - Client Component では `cookies()` を使えない（ブラウザ実行では next/headers が使えない）。
   */
  const cookieStore = cookies();

  /**
   * console.log(cookieStore)
   *
   * - これは **サーバ側のログ** に出力される（ブラウザの DevTools の console ではない）。
   * - 開発中に「Cookie が届いているか」「どんなキーがあるか」を確認する目的で置くのは有効。
   *
   * 運用注意：
   * - Cookie にはセッションIDなど機微情報が含まれることがあるため、
   *   本番環境でログに出し続けるのは避けるのが基本。
   */
  console.log(cookieStore);

  return (
    <div>
      {/**
       * ページ見出し
       *
       * - ここは固定表示だが、Cookie を使えば例えば
       *   - 言語切り替え（日本語/英語）
       *   - ログイン時だけ追加情報を出す
       *   などの分岐表示が可能になる。
       */}
      <h1>企業概要</h1>
    </div>
  );
}