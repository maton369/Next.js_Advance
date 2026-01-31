import * as Layout from "sns-shared-ui/src/components/Layout";
import { ClientRootLayout } from "../_components/ClientRootLayout";
import { LayoutHeader } from "../_components/LayoutHeader";
import { LayoutNavigation } from "../_components/LayoutNavigation";
import { PhotoIdsContextProvider } from "../_components/PhotoViewNavigator/provider";

/**
 * Props（SiteLayout が受け取る入力）
 *
 * children:
 * - 通常のページコンテンツ（各 route の page.tsx が描画する内容）。
 * - レイアウトの “メイン領域” に差し込まれる。
 *
 * modal:
 * - Parallel Routes（並列ルート）で追加される “スロット” の内容。
 * - Intercepting Routes と組み合わせることで、
 *   背景（children）を保ったまま “モーダルだけを差し込む” 描画が可能になる。
 *
 * アルゴリズム的には：
 * - “URL によって変わる UI” を
 *   - メイン（children）
 *   - 追加レイヤ（modal）
 *   に分解して合成するための入力。
 */
type Props = {
  children: React.ReactNode;
  modal: React.ReactNode;
};

/**
 * SiteLayout（サイト共通レイアウト + モーダルスロット合成）
 *
 * 役割：
 * - サイト全体の共通フレーム（Header / Navigation / Main / Footer）を統一する
 * - PhotoIdsContextProvider により、写真拡大表示（モーダル）で必要な共有状態を配下へ供給する
 * - Layout.Main で children と modal を “同じ領域に合成” して描画する
 *
 * async である理由（設計上の余地）：
 * - 現状は await していないが、将来的にレイアウトでデータ取得（カテゴリ一覧やセッション等）を行う場合、
 *   async にしておくとそのまま拡張できる。
 * - ただし不要なら async を外すと意図が明確になる（どちらでも成立）。
 *
 * アルゴリズム的な見方（共通レイアウト + スロット差し込み）：
 * 1. Provider を最上位に置き、配下で “写真ID列や現在位置” などの共有情報を参照できるようにする
 * 2. ClientRootLayout 配下にサイト UI を組み立てる（クライアント専用の処理をここに集約できる）
 * 3. Layout.Container で Navigation と Main の配置を確定
 * 4. Layout.Main 内で children（背景ページ）→ modal（前面レイヤ）を順に描画し、モーダルを重ねる
 */
export default async function SiteLayout({ children, modal }: Props) {
  return (
    /**
     * PhotoIdsContextProvider（写真拡大表示用の共有状態を配る Provider）
     *
     * ★ コメントの意図：
     * - 写真拡大表示モーダルで “キーボード操作（次/前）” を実現するには、
     *   表示対象になり得る写真IDの一覧や、現在位置などの “横断的な状態” が必要。
     * - それを Context としてレイアウト配下に流すことで、
     *   背景ページ側とモーダル側が同じ情報を共有できる。
     *
     * アルゴリズム的には：
     * - “グローバルに近い共有データ” をツリー全体に供給し、各コンポーネントが参照して動けるようにする。
     */
    <PhotoIdsContextProvider>
      {/* ★ ↑: 写真拡大表示画面キーボード操作のための Provider */}

      {/**
       * ClientRootLayout（クライアント側の共通ルート）
       *
       * - LayoutHeader や LayoutNavigation にはクライアント処理（Hook/イベント）が含まれる可能性がある。
       * - その場合、上位を Client Component にしておくことで、配下を自然にクライアントとして扱える。
       *
       * アルゴリズム的には：
       * - “サーバで組むレイアウト” に “クライアントの振る舞い” を安全に混ぜるための層。
       */}
      <ClientRootLayout>
        {/**
         * LayoutHeader（ヘッダー領域）
         *
         * - ロゴ、検索、ログイン状態の表示などを持つ想定の共通ヘッダー。
         */}
        <LayoutHeader />

        {/**
         * Layout.Container（メインの配置枠）
         *
         * - ナビゲーション（左）とメイン（右）をレイアウトするための枠。
         * - CSS 的なグリッド/フレックスの責務は shared-ui 側に寄せられている想定。
         */}
        <Layout.Container>
          {/**
           * LayoutNavigation（ナビゲーション領域）
           *
           * - usePathname や signIn、投稿モーダルなどの導線を持つ想定。
           * - つまり “現在地” と “認証状態” に応じて振る舞いが変わることが多い領域。
           */}
          <LayoutNavigation />

          {/**
           * Layout.Main（メイン領域：children と modal を合成する場所）
           *
           * children:
           * - 通常ページ本体（背景）。
           *
           * modal:
           * - Parallel Routes のスロット。
           * - Intercepting Routes により “本来のページ遷移先” をモーダルとして差し込むことで、
           *   背景ページを維持したまま、前面にモーダルを重ねる UI が実現できる。
           *
           * 描画順が重要：
           * - {children} を先に置くことで背景として出る
           * - {modal} を後に置くことで前面レイヤとして重なりやすい（CSS の実装次第）
           *
           * アルゴリズム的には：
           * - “URLが表す画面” を「背景（children）」＋「前景（modal）」として分解し、
           *   1つの DOM ツリー内で合成している。
           */}
          <Layout.Main>
            {children}

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