import * as Layout from "sns-shared-ui/src/components/Layout";

/**
 * Props（レイアウトが受け取る子要素）
 *
 * - App Router の layout は、配下のページ/レイアウトを `children` として受け取る。
 * - つまり、この SiteLayout は「共通枠」を提供し、その中身（ページ本体）だけを差し替える設計である。
 */
type Props = {
  children: React.ReactNode;
};

/**
 * SiteLayout（共通レイアウト：簡易版）
 *
 * - sns-shared-ui の Layout コンポーネント群を使って、ページ共通の構造を組み立てている。
 * - この版は “ナビゲーションやカテゴリ取得” などのデータ依存が無く、
 *   ヘッダー・メイン・フッターだけの最小構成になっている。
 *
 * なぜ async なのか（現状では必須ではないが書ける）：
 * - このレイアウト内で将来、認証情報や設定、共通データ取得を行う可能性がある場合、
 *   async にしておくと `await` を自然に追加できる。
 * - 一方で、現時点で await が無いなら同期関数でも動作上は問題ない。
 *
 * アルゴリズム的な見方（レイアウト適用のパイプライン）：
 * 1. ルーティングにより、この layout 配下で表示すべき page が決まる
 * 2. Next.js が page の UI を children として SiteLayout に渡す
 * 3. SiteLayout が共通枠（Header/Main/Footer）を作り、Main に children を差し込む
 * 4. どのページでも同じ枠組みで表示され、差し替わるのは Main の中身だけになる
 */
export default async function SiteLayout({ children }: Props) {
  return (
    /**
     * Layout.Root
     *
     * - レイアウト全体の最上位ラッパー。
     * - ページ全体の背景色、フォント、縦方向の並び（ヘッダー→本文→フッター）など、
     *   “レイアウトの基盤” を提供する役割を持つことが多い。
     */
    <Layout.Root>
      {/**
       * Layout.Header（共通ヘッダー）
       *
       * showDrawerMenu={false} の意味（推測される仕様）：
       * - ドロワーメニュー（ハンバーガーメニューなど）を表示しない設定。
       * - 例えば「ログイン前ページ」や「最小構成ページ」などで
       *   グローバルナビを出したくない場合に使う。
       *
       * アルゴリズム的には：
       * - Header という同じコンポーネントを使いつつ、
       *   props によって “表示モード” を切り替えている（分岐点）。
       */}
      <Layout.Header showDrawerMenu={false} />

      {/**
       * Layout.Container（本文領域のコンテナ）
       *
       * - メイン領域の横幅、余白、中央寄せなどを統一するための枠。
       * - ナビゲーションが無い場合でも、本文の見た目を一定に保てる。
       */}
      <Layout.Container>
        {/**
         * Layout.Main（メインコンテンツ）
         *
         * - ここがページごとに差し替わる領域。
         * - children（ルーティング結果のページUI）を差し込み、
         *   “共通枠 + ページ固有内容” を合成する。
         *
         * アルゴリズム的には：
         * - 固定部分（Header/Footer） + 可変部分（children）を合成する “テンプレート” である。
         */}
        <Layout.Main>{children}</Layout.Main>
      </Layout.Container>

      {/**
       * Layout.Footer（共通フッター）
       *
       * - サイト共通の補足情報やリンクを配置する領域。
       * - Header と同様、ページごとに差し替えず共通で表示する。
       */}
      <Layout.Footer />
    </Layout.Root>
  );
}