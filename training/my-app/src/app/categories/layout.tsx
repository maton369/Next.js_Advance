import styles from "./layout.module.css";

type Props = {
  /**
   * children
   *
   * - このレイアウト配下にある各ページ（page.tsx）や、
   *   さらに下階層の layout/page がレンダリングした結果が children として渡される。
   * - つまり Layout は「枠（共通の見た目・配置）」を提供し、children が「中身」を担う。
   */
  children: React.ReactNode;
};

// ★:「/categories」配下で全適用されるレイアウト
/**
 * (カテゴリ配下専用) Layout
 *
 * - App Router では、`app/categories/layout.tsx` のようにディレクトリ直下に layout を置くと、
 *   そのディレクトリ配下の全ルートに対してレイアウトが適用される。
 *
 * 適用範囲の例：
 * - /categories                （app/categories/page.tsx）
 * - /categories/flower         （app/categories/[categoryName]/page.tsx）
 * - /categories/flower?page=2  （同上。クエリが付いても同じルート配下なので適用される）
 *
 * アルゴリズム的な見方（レイアウト合成）：
 * 1. Next.js は URL に対応する page を探す（例：/categories/flower → [categoryName]/page.tsx）
 * 2. 見つかった page を包含する layout を「内側から外側へ」積み上げて合成する
 *    - 例：RootLayout（app/layout.tsx） → CategoriesLayout（app/categories/layout.tsx） → Page
 * 3. 合成結果として、RootLayout の枠の中に CategoriesLayout の枠が入り、
 *    さらにその内側に Page の内容（children）が差し込まれて表示される
 *
 * つまりこの Layout は、「カテゴリ配下にだけ共通の余白・幅・背景などを当てたい」
 * といった要件を、ページ実装を汚さずに満たすための“局所的な共通枠”である。
 */
export default function Layout({ children }: Props) {
  /**
   * styles.container（CSS Modules）
   *
   * - `layout.module.css` のクラスを import して使用しているため、
   *   クラス名はこのコンポーネントに局所化され、他の画面の CSS と衝突しにくい。
   * - ここには「/categories 配下の共通デザイン」を集約する想定。
   *   例：最大幅、左右余白、背景色、カード風枠、レイアウトグリッドなど。
   */
  return <div className={styles.container}>{children}</div>;
}