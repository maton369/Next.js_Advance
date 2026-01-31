"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn } from "next-auth/react";
import { Icon } from "sns-shared-ui/src/components/Icon";
import * as Layout from "sns-shared-ui/src/components/Layout";
import { renderLink } from "sns-shared-ui/src/components/Layout/Navigation";
import type { GetCategoriesResponse } from "@/services/getCategories";
import { PhotoCreateModalContainer } from "../PhotoCreateModalContainer";
import styles from "./style.module.css";
import type { Session } from "next-auth";

/**
 * Props（LayoutNavigation が受け取る入力）
 *
 * session:
 * - NextAuth のセッション情報。
 * - ログインしていない場合は null。
 * - このコンポーネントでは「投稿ボタンの挙動分岐（モーダル or signIn）」に使う。
 *
 * categories:
 * - カテゴリー一覧データ。
 * - PhotoCreateModalContainer に渡して、投稿作成モーダル内でカテゴリーを選択できるようにする想定。
 *
 * アルゴリズム的には：
 * - “ナビゲーションの表示状態” を決めるための入力（認証状態 + ドメインデータ）を束ねたもの。
 */
type Props = {
  session: Session | null;
  categories: GetCategoriesResponse["categories"];
};

/**
 * LayoutNavigation（サイト共通のナビゲーション）
 *
 * 役割：
 * - 現在のパス（usePathname）を元に “アクティブリンク” の見た目を制御する
 * - 「プロフィール」へのリンクを表示する
 * - 「投稿（post）」は認証状態で挙動を変える
 *   - ログイン済み：投稿作成モーダル（PhotoCreateModalContainer）を開く
 *   - 未ログイン：signIn() を呼んでログインフローへ誘導する
 *
 * なぜ "use client" が必要か：
 * - usePathname（Hook）を使う
 * - signIn（クリックイベント）を使う
 * - モーダル起動などクライアント側のインタラクションがある
 *
 * アルゴリズム的な見方（現在地判定 + 認証分岐）：
 * 1. currentPathname を取得し「今どのページか」を知る
 * 2. currentPathname とリンク先を比較し、アクティブ状態（aria-current 等）を決める
 * 3. session の有無で「投稿」導線の挙動を分岐する
 * 4. それらを Layout.Navigation に渡し、共通レイアウトで整える
 */
export function LayoutNavigation({ session, categories }: Props) {
  /**
   * usePathname（現在のパスの取得）
   *
   * - App Router の Hook。
   * - 例：/profile なら "/profile" が返る。
   *
   * アルゴリズム的には：
   * - “ルータが持つ現在地状態” を取得して UI に反映するための入力。
   */
  const currentPathname = usePathname();

  /**
   * linkClassName（リンクの共通クラス）
   *
   * - 共有UI（Layout.Navigation）と、各リンクで同じクラスを使いたいので変数化している。
   * - CSS Modules により、クラス名はこのファイルスコープに閉じる。
   */
  const linkClassName = styles.navigationLinkClassName;

  return (
    /**
     * Layout.Navigation（共有UIコンポーネント）
     *
     * linkClassName:
     * - ナビゲーション内リンクに適用するクラス名を渡す。
     *
     * currentPathname:
     * - Layout.Navigation 側が “現在地” を元にリンクの見た目や aria-current を制御できるように渡す。
     *
     * アルゴリズム的には：
     * - “現在地（currentPathname）” と “各リンクの行き先” の比較により、
     *   アクティブ状態を決定する処理を共有UI側に委譲している。
     */
    <Layout.Navigation
      linkClassName={linkClassName}
      currentPathname={currentPathname}
    >
      <>
        {/**
         * 1) Profile リンク
         *
         * - renderLink は “アクティブ状態なら attr（aria-current など）を渡す” ためのユーティリティ想定。
         * - currentPathname === "/profile" の結果に応じて attr が決まる。
         *
         * アルゴリズム的には：
         * - “現在地判定（pathname比較）” → “リンク属性（aria-current 等）” の生成。
         */}
        <li className={styles.listitem}>
          {renderLink(currentPathname === "/profile", (attr) => (
            /**
             * Next.js の Link
             *
             * - href="/profile" に遷移する。
             * - className は共通 linkClassName を利用。
             * - {...attr} は renderLink が返す aria-current 等を展開して付与する。
             *
             * Icon の色分岐：
             * - Boolean(attr) が true（＝アクティブ）なら orange、そうでなければ black。
             * - attr の有無で見た目を切り替えることで “現在地” を視覚的にも示す。
             */
            <Link href="/profile" className={linkClassName} {...attr}>
              <Icon type="user" color={Boolean(attr) ? "orange" : "black"} />
              profile
            </Link>
          ))}
        </li>

        {/**
         * 2) Post（投稿）導線
         *
         * ここがこのコンポーネントのメインの分岐点：
         * - session?.user がある（ログイン済み）なら、投稿作成モーダルを開く導線
         * - ない（未ログイン）なら、signIn() を呼んで認証へ誘導する導線
         *
         * アルゴリズム的には：
         * - “認証状態（session.user の有無）” による分岐で、UI と挙動を切り替えている。
         */}
        <li className={styles.listitem}>
          {/* ★ ログイン済みの場合モーダルを開き、未ログインの場合ログイン画面へ */}
          {session?.user ? (
            /**
             * ログイン済み：PhotoCreateModalContainer をトリガーにする
             *
             * - PhotoCreateModalContainer は children をトリガーとして受け取り、
             *   クリックで投稿作成モーダルを開くコンテナである想定。
             * - categories を渡しているため、モーダル内でカテゴリ選択が可能になる。
             *
             * children を <span> にしているのは、
             * - 「見た目はリンク/ボタンっぽいが、実体はモーダルトリガー」
             *   という設計に合わせた表現だと考えられる。
             *
             * clsx:
             * - styles.listitemChild と linkClassName を結合し、
             *   クリック対象の見た目を統一する。
             *
             * アルゴリズム的には：
             * - “投稿操作” を “ページ遷移” ではなく “モーダル表示” に変換する分岐。
             */
            <PhotoCreateModalContainer categories={categories}>
              <span className={clsx(styles.listitemChild, linkClassName)}>
                <Icon type="camera" />
                post
              </span>
            </PhotoCreateModalContainer>
          ) : (
            /**
             * 未ログイン：signIn() を呼ぶ
             *
             * - NextAuth の signIn は認証プロバイダへリダイレクト（またはポップアップ）する入口。
             * - ここでは引数なしで呼んでいるため、NextAuth の既定挙動（設定済みプロバイダ）に従う。
             *
             * className:
             * - ログイン済みの導線と同じ見た目になるよう clsx で同じクラス構成にしている。
             *
             * アルゴリズム的には：
             * - “投稿したい” という操作要求を “認証フロー開始” に変換するゲート。
             * - 認証が必要な機能の手前で、ユーザー体験として自然にログインへ誘導している。
             */
            <button
              className={clsx(styles.listitemChild, linkClassName)}
              onClick={() => signIn()}
            >
              <Icon type="camera" />
              post
            </button>
          )}
        </li>
      </>
    </Layout.Navigation>
  );
}