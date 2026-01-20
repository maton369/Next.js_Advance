"use client"; // ★: "use client" ディレクティブを追加する（＝このファイルをクライアントコンポーネントとして扱う）

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./style.module.css";

/**
 * getAriaCurrent
 *
 * - アクセシビリティ（A11y）のための補助関数。
 * - ナビゲーション内で「今いるページ（現在地）」をスクリーンリーダー等に伝えるには、
 *   `aria-current="page"` を付与するのが定石。
 *
 * なぜ関数にしているか（設計意図）：
 * - <Link> に毎回 `aria-current` を手で書くと冗長になる。
 * - 条件付きで props を付けたいだけなので「propsオブジェクトを返す関数」にすると、
 *   JSX 側がスッキリする（`{...getAriaCurrent(...)}` の形で合成できる）。
 *
 * アルゴリズム的な見方：
 * - 入力：flag（現在地かどうか）
 * - 出力：現在地なら `{ "aria-current": "page" }`、そうでなければ `undefined`
 * - JSX 側で `...`（スプレッド）すると、undefined の場合は何も付与されない。
 */
function getAriaCurrent(flag: boolean) {
  // "page" as const にしている理由：
  // - TypeScript に対して `"page"` を string ではなくリテラル型として扱わせることで、
  //   aria-current の型推論をより厳密にできる（誤入力の防止）。
  return flag ? { "aria-current": "page" as const } : undefined;
}

/**
 * Nav（ナビゲーション：現在地ハイライト対応）
 *
 * - `usePathname()` を使って「今のURLパス」を取得し、
 *   その値に応じて各リンクに `aria-current="page"` を付与する。
 * - これにより、見た目の強調（CSS）だけでなく、アクセシビリティ上の“現在地”情報も提供できる。
 *
 * 重要：なぜ "use client" が必要か？
 * - `usePathname()` はクライアント側のナビゲーション状態（現在のパス）を参照するフックであり、
 *   Server Component では使えない。
 * - また、ページ遷移に応じて `pathName` が変化し、Nav が再レンダリングされるのも
 *   クライアント側の仕組みである。
 *
 * アルゴリズム的な見方（現在地判定→props付与→描画）：
 * 1. `usePathname()` で現在のパス（例："/", "/categories", "/categories/flower"）を取得する
 * 2. 各 Link に対して「今いる場所か？」の判定を行う
 * 3. true のリンクにだけ `aria-current="page"` を付与する
 * 4. その結果、支援技術が現在地を認識できる（必要なら CSS で見た目の強調もできる）
 */
export function Nav() {
  // ★: usePathname Hook を使用して、現在のパスを取得したい
  /**
   * usePathname
   *
   * - 現在の URL の pathname（クエリ `?page=...` などを除いたパス部分）を返す。
   *   例：
   *   - "/" → "/"
   *   - "/categories?page=2" → "/categories"（クエリは含まれない）
   *   - "/categories/flower?page=2" → "/categories/flower"
   *
   * これを使う目的：
   * - ナビの「現在地表示（アクティブ状態）」を、URL から自動判定するため。
   */
  const pathName = usePathname();

  return (
    /**
     * <nav> は「ナビゲーション領域」を意味するセマンティック要素。
     * - 支援技術がページ内の移動導線として認識しやすい。
     *
     * styles.nav は CSS Modules のクラス。
     * - nav の幅、余白、背景、リストスタイルなどを局所的に管理できる。
     */
    <nav className={styles.nav}>
      <ul>
        <li>
          {/**
           * トップへのリンク
           *
           * 現在地判定：
           * - トップは pathname が厳密に "/" のときだけ active と見なす。
           *
           * props付与：
           * - `getAriaCurrent(pathName === "/")` が true のときだけ
           *   `{ "aria-current": "page" }` を返し、スプレッドで <Link> に付く。
           * - false のときは undefined なので何も付与されない。
           */}
          <Link href="/" {...getAriaCurrent(pathName === "/")}>
            トップ
          </Link>
        </li>

        <li>
          {/**
           * カテゴリー一覧へのリンク
           *
           * 現在地判定：
           * - `/categories` 自体だけでなく、`/categories/flower` のような配下ページも
           *   “カテゴリ領域にいる” として active にしたい。
           * - そのため `startsWith("/categories")` を使って前方一致で判定している。
           *
           * 例：
           * - "/categories" → true（一覧）
           * - "/categories/flower" → true（カテゴリ詳細）
           * - "/" → false
           *
           * こうすると、カテゴリ配下に入った瞬間に「カテゴリー一覧」メニューが current になり、
           * “今どのセクションにいるか” が分かりやすくなる。
           */}
          <Link
            href="/categories"
            {...getAriaCurrent(pathName.startsWith("/categories"))}
          >
            カテゴリー一覧
          </Link>
        </li>
      </ul>
    </nav>
  );
}