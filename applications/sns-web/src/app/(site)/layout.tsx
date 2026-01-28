import * as Layout from "sns-shared-ui/src/components/Layout";
import { getCategories } from "@/services/getCategories";
import { LayoutNavigation } from "../_components/LayoutNavigation";

/**
 * Props（レイアウトが受け取る子要素）
 *
 * - App Router の `layout.tsx` は、配下の page / layout を `children` として受け取る。
 * - つまり、SiteLayout は「共通UIの枠」を作り、その中にルーティング結果（children）を差し込む。
 */
type Props = {
  children: React.ReactNode;
};

/**
 * SiteLayout（サイト全体に共通のレイアウト）
 *
 * - `async` な layout は、サーバ側でデータ取得（fetch/DB/サービス呼び出し）を行い、
 *   その結果を使って “共通のナビゲーションやヘッダー” を構築できる。
 *
 * ここでやっていること：
 * 1. カテゴリ一覧を取得する（getCategories）
 * 2. 共通レイアウト（Root/Header/Container/Main/Footer）を組み立てる
 * 3. ナビゲーションにカテゴリ一覧を渡して表示する（LayoutNavigation）
 * 4. メイン領域に children（ページ本体）を差し込む
 *
 * アルゴリズム的な見方（データ取得→枠組み生成→差し込み）：
 * - 入力：ルーティングで決まった children（ページUI）
 * - 追加データ：categories（ナビゲーションに必要な共通データ）
 * - 出力：ヘッダー/フッター/ナビ + 本文が揃った完成HTML
 *
 * ポイント：
 * - Layout はページごとに再利用されるため、ここで取得する categories は
 *   “サイト全体で共通に使うデータ” の代表例である。
 * - 逆に、ページごとにしか要らないデータ取得は Page 側に寄せた方が責務が明確になる。
 */
export default async function SiteLayout({ children }: Props) {
  /**
   * カテゴリ一覧の取得
   *
   * - `getCategories()` は API あるいは DB を呼び出してカテゴリ一覧を返すサービス関数。
   * - ここでは `{ categories }` を受け取っているため、戻り値の形は
   *   `{ categories: Category[] }` のようなオブジェクトを想定している。
   *
   * アルゴリズム的には：
   * - “ナビゲーションに必要な共通データ” を先に確定させてから、
   *   そのデータを使ってレイアウトを構築する、という順序になる。
   */
  const { categories } = await getCategories();

  return (
    /**
     * sns-shared-ui の Layout コンポーネント群
     *
     * - `import * as Layout` としているため、Layout 配下に
     *   Root/Header/Container/Main/Footer などの部品がまとまっている設計を想定。
     *
     * 設計意図（推測されるメリット）：
     * - 共通レイアウトのDOM構造・スタイル・責務を shared-ui 側に集約できる
     * - アプリ側は「どこに何を差し込むか」だけを意識すればよくなる
     */
    <Layout.Root>
      {/**
       * Header（共通ヘッダー）
       *
       * - サイト名、ログイン情報、グローバルメニューなどを置く想定。
       * - ここはページに依存しない共通UIとして固定で配置している。
       */}
      <Layout.Header />

      {/**
       * Container（ナビ＋メインをまとめる領域）
       *
       * - レイアウトの横幅、余白、2カラム構造などを作るためのラッパーであることが多い。
       */}
      <Layout.Container>
        {/**
         * LayoutNavigation（サイドナビ/グローバルナビ）
         *
         * ★ のポイント：
         * - ここに categories を渡すことで、ナビゲーションが “カテゴリ一覧” を表示できる。
         * - ナビは多くのページで共通なので、layout で取得して渡すのが自然。
         *
         * アルゴリズム的には：
         * - categories（データ） → ナビのUI（リンク一覧）への変換処理が
         *   LayoutNavigation 内部で行われる、という責務分離になっている。
         */}
        <LayoutNavigation categories={categories} /> {/* ★ */}

        {/**
         * Main（メインコンテンツ領域）
         *
         * - ここに children を差し込むことで、
         *   ルーティングで決まったページの UI が表示される。
         *
         * アルゴリズム的には：
         * - “共通の枠（Header/Nav/Footer）” は固定
         * - “変化する部分（ページ本体）” だけを children として差し替える
         * という「差分更新可能な構造」を作っている。
         */}
        <Layout.Main>{children}</Layout.Main>
      </Layout.Container>

      {/**
       * Footer（共通フッター）
       *
       * - コピーライトやリンク、規約への導線などを置く想定。
       * - こちらもページに依存しない共通UIなので固定配置。
       */}
      <Layout.Footer />
    </Layout.Root>
  );
}