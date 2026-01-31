import * as Layout from "sns-shared-ui/src/components/Layout";
import { ClientRootLayout } from "../_components/ClientRootLayout";
import { LayoutHeader } from "../_components/LayoutHeader";
import { LayoutNavigation } from "../_components/LayoutNavigation";
import { PhotoIdsContextProvider } from "../_components/PhotoViewNavigator/provider";

/**
 * Props（SiteLayout が受け取る入力）
 *
 * children:
 * - このレイアウト配下の通常ページ本体（各 route の page.tsx の内容）が入る。
 *
 * modal:
 * - Next.js App Router の Parallel Routes / Intercepting Routes を使うと、
 *   “同じレイアウトの中に別のスロット” を追加できる。
 * - そのスロットに入るのが modal であり、モーダルUI（写真拡大表示など）を差し込む用途。
 *
 * 重要：
 * - modal は「ページ本体とは独立した描画領域」であり、
 *   “通常のページ遷移” と “モーダル表示の遷移” を同居させる設計にするための引数である。
 *
 * アルゴリズム的には：
 * - “1つのURL遷移” を「メイン領域（children）」と「モーダル領域（modal）」に分解して描画するための入力。
 */
type Props = {
  children: React.ReactNode;
  modal: React.ReactNode;
};

/**
 * SiteLayout（サイト共通レイアウト + モーダルスロット付き）
 *
 * 役割：
 * - サイト全体の枠組み（Header / Navigation / Main / Footer）を共通化する
 * - Provider（PhotoIdsContextProvider）で、写真拡大表示に必要な “共有状態” をレイアウト配下に供給する
 * - Parallel Routes / Intercepting Routes を使って modal スロットを Layout.Main 内に差し込む
 *
 * なぜ async なのか：
 * - 現状のコードでは await はしていないが、
 *   LayoutHeader や LayoutNavigation が Server 側でデータ取得する設計に変わる可能性があるため、
 *   レイアウトを async にしておくと拡張しやすい。
 * - ただし “本当に不要なら async を外す” という整理も可能。
 *
 * アルゴリズム的な見方（レイアウト合成 + スロット差し込み）：
 * 1. Provider を最外側に置き、配下のコンポーネントが context を参照できるようにする
 * 2. ClientRootLayout でクライアント側の共通処理（イベント、状態管理、UI制御）をまとめる
 * 3. Layout（共有UI）の Root 構造に沿って Header/Navigation/Main/Footer を配置
 * 4. Main の中で children（通常ページ）と modal（モーダルスロット）を合成して描画する
 */
export default async function SiteLayout({ children, modal }: Props) {
  return (
    /**
     * PhotoIdsContextProvider（写真拡大表示のための Provider）
     *
     * ★ コメントの意図：
     * - 写真拡大表示（モーダル）を開いたときに、
     *   キーボード操作（例：左右キーで次/前の写真へ）を実現するには
     *   “現在表示している写真ID” と “次に進むべき写真ID列” のような共有状態が必要になりやすい。
     *
     * - その共有状態を Context としてレイアウト配下に供給するのが PhotoIdsContextProvider。
     *
     * アルゴリズム的には：
     * - “横断的な状態（ナビゲーション用のID列）” を UI ツリー全体に配布する仕組み。
     */
    <PhotoIdsContextProvider>
      {/* ★ ↑: 写真拡大表示画面キーボード操作のための Provider */}

      {/**
       * ClientRootLayout（クライアント側の共通レイアウト層）
       *
       * - レイアウト自体は Server Component で書けるが、
       *   配下でクライアント専用の機能（Hook、イベント、状態）を使いたい場合がある。
       * - そこで “外枠だけ” を ClientRootLayout にして、
       *   その内側でクライアント処理をまとめる構成がよく使われる。
       *
       * アルゴリズム的には：
       * - “サーバレンダリングの枠” と “クライアントの振る舞い” を分離しつつ合成する層。
       */}
      <ClientRootLayout>
        {/**
         * LayoutHeader（ヘッダー領域）
         *
         * - サイト共通のヘッダー。
         * - 認証情報や検索、ロゴなどを表示する想定。
         */}
        <LayoutHeader />

        {/**
         * Layout.Container（レイアウトのメイン枠）
         *
         * - sns-shared-ui の Layout コンポーネント群で、ページ全体のレイアウトを統一する。
         * - Navigation と Main を横並びにするなどの責務を持つ想定。
         */}
        <Layout.Container>
          {/**
           * LayoutNavigation（左ナビゲーション）
           *
           * - サイト内の主要リンクや投稿ボタンなどを持つ。
           * - ここも Client Component で、usePathname や signIn を使う実装が含まれていた。
           */}
          <LayoutNavigation />

          {/**
           * Layout.Main（メイン表示領域）
           *
           * - children（通常ページ本体）を表示する
           * - modal（モーダルスロット）も同じ Main 内に合成して表示する
           *
           * ここが “Parallel Routes / Intercepting Routes” の肝：
           * - 通常のページ遷移は children が変わる
           * - モーダルを開く遷移は modal スロットが埋まる（または差し替わる）
           *
           * アルゴリズム的には：
           * - “URL から導かれる UI の部分集合” を
           *   - メイン（children）
           *   - オーバーレイ/モーダル（modal）
           *   に分割して同時に描画している。
           */}
          <Layout.Main>
            {/**
             * children（通常ページのレンダリング）
             *
             * - 例：トップ、カテゴリ一覧、プロフィールなど。
             */}
            {children}

            {/**
             * modal（モーダルスロットのレンダリング）
             *
             * ★ コメントの意図：
             * - Parallel Routes / Intercepting Routes により、
             *   “同じページ構造のまま、モーダルだけが追加で表示される” 遷移を実現できる。
             *
             * 例のイメージ：
             * - /photos/123 を “モーダル表示” として割り込ませて、
             *   背景は / のまま、上に写真詳細モーダルを表示する、など。
             *
             * アルゴリズム的には：
             * - “背景ページを保ったまま、追加レイヤ（modal）を差し込む” 合成描画。
             */}
            {/* ★ ↓: Parallel & Intercepting Routes によるモーダル表示 */}
            {modal}
          </Layout.Main>
        </Layout.Container>

        {/**
         * Layout.Footer（フッター領域）
         *
         * - サイト共通のフッター。
         */}
        <Layout.Footer />
      </ClientRootLayout>
    </PhotoIdsContextProvider>
  );
}