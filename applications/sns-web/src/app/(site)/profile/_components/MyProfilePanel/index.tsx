"use client";
// ❌: 不要な use client

import { LinkButton } from "sns-shared-ui/src/components/LinkButton";
import { ProfilePanel } from "sns-shared-ui/src/components/ProfilePanel";
import styles from "./style.module.css";

/**
 * Props（MyProfilePanel が受け取るデータ構造）
 *
 * このコンポーネントは “表示専用” のパネルであり、
 * すでにサーバ側で取得された user / profile を描画するのが役割である。
 *
 * user:
 * - 認証セッション（NextAuth）から得たユーザー情報を想定している。
 * - id は必須、name/email/image は optional（未設定の可能性がある）としている。
 *
 * profile:
 * - DB（Prisma）の Profile レコードを想定している。
 * - bio/screenName は未設定の可能性があるため null を許容している。
 *
 * アルゴリズム的には：
 * - “入力データ（user/profile）” を “UI の props 形状” に整形して渡すための型定義。
 */
type Props = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  profile: {
    id: string;
    bio: string | null;
    screenName: string | null;
    userId: string;
  };
};

/**
 * MyProfilePanel（マイページのプロフィール表示コンポーネント）
 *
 * 役割：
 * - user と profile の情報をまとめて ProfilePanel に渡し、見た目の整ったプロフィール表示を作る。
 * - 「プロフィールを編集する」への導線（LinkButton）を配置する。
 *
 * アルゴリズム的な見方（データ整形 → 表示）：
 * 1. user.image / user.name / profile.screenName / profile.bio を取り出す
 * 2. null/undefined を空文字に正規化する（UI の表示崩れを防ぐ）
 * 3. ProfilePanel に props として渡す
 * 4. 子要素として “編集画面へのリンクボタン” を埋め込む
 *
 * ❌: "use client" が不要とされる理由（このコードの構造から分かること）：
 * - このコンポーネント自体は
 *   - useState/useEffect などの React Hooks を使っていない
 *   - onClick などのイベントハンドラを持っていない
 *   - ブラウザ固有API（window/document 等）を使っていない
 *   ため、単体としては Server Component として書ける可能性が高い。
 *
 * ただし注意点：
 * - ここで import している `LinkButton` や `ProfilePanel` が
 *   内部で "use client" を要求する（イベントやフックを使う）場合は、
 *   結果的にこのコンポーネントも Client 側で動かさざるを得ない。
 *
 * つまりアルゴリズム的には：
 * - “依存している部品がクライアント実行を要求するかどうか” が伝搬し、
 *   必要であればこのコンポーネントもクライアントになる、という構造である。
 */
export function MyProfilePanel({ user, profile }: Props) {
  return (
    /**
     * ProfilePanel（共有UIコンポーネント）
     *
     * - デザイン/レイアウトは sns-shared-ui 側に閉じ込め、
     *   ここでは “表示したい情報” だけを渡す。
     *
     * 渡している値の正規化：
     * - user.image は string | null | undefined の可能性がある
     *   → ProfilePanel 側が string を想定するなら undefined/null を許容するか要確認
     * - name/screenName/bio は空文字にフォールバックしている
     *   → 「未設定でも UI を壊さない」ための安全策
     *
     * アルゴリズム的には：
     * - “DB/認証由来のデータ” を “UI の入力形式” に合わせて整形する変換層。
     */
    <ProfilePanel
      imageUrl={user.image}
      name={user.name || ""}
      screenName={profile.screenName || ""}
      bio={profile.bio || ""}
    >
      {/**
       * 編集ボタンのラッパー
       *
       * - styles.button によりボタン配置（余白/右寄せ等）を調整している想定。
       * - UI上は ProfilePanel の内部に “追加アクション領域” として表示される。
       */}
      <div className={styles.button}>
        {/**
         * LinkButton（リンク型のボタン）
         *
         * - href="/profile/edit" へ遷移する導線。
         * - Next.js の Link を内部で利用している想定で、
         *   “ページ遷移” はルータが処理する（可能であればクライアントサイド遷移）。
         *
         * アルゴリズム的には：
         * - ユーザー操作（クリック） → ルーターが href を解決 → /profile/edit へ遷移
         * という遷移パイプラインの入口である。
         */
        <LinkButton href="/profile/edit" color="white">
          プロフィールを編集する
        </LinkButton>
      </div>
    </ProfilePanel>
  );
}