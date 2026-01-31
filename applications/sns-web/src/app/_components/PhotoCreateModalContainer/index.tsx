"use client";

import type { ReactNode } from "react";
import { ModalContainer } from "@/app/_components/ModalContainer";
import { PhotoCreateModal } from "@/app/_components/PhotoCreateModal";
import type { GetCategoriesResponse } from "@/services/getCategories";
import { PhotoCreateForm } from "../PhotoCreateForm";

/**
 * Props（PhotoCreateModalContainer の入力）
 *
 * children:
 * - モーダルを開くトリガーとして表示する UI。
 * - 例：ナビゲーションの「post」ボタン、カード、アイコンなど。
 *
 * toggleClassName:
 * - トリガー（ModalContainer 内部の button）に追加で付与するクラス名。
 * - 呼び出し元でサイズや見た目をカスタマイズしたいときに使う。
 *
 * & GetCategoriesResponse:
 * - getCategories のレスポンス型（{ categories: ... }）をそのまま Props に合成している。
 * - ここでは categories をモーダル内部（フォーム）に渡すために必要。
 *
 * アルゴリズム的には：
 * - “モーダル表示に必要な入力（トリガーUI + ドメインデータ）” をまとめた型定義。
 */
type Props = {
  children: ReactNode;
  toggleClassName?: string;
} & GetCategoriesResponse;

/**
 * PhotoCreateModalContainer（投稿作成モーダル用コンテナ）
 *
 * 役割：
 * - ModalContainer を使って「開閉制御」を共通化する
 * - モーダルの “枠” を PhotoCreateModal に任せる
 * - モーダルの “中身（フォーム）” を PhotoCreateForm に任せる
 * - closeModal をモーダル枠/フォームへ注入し、どこからでも閉じられるようにする
 *
 * なぜ "use client" が必要か：
 * - ModalContainer はクリックイベントと state（isOpen）を持つ Client Component であり、
 *   それを利用するこのコンテナも Client Component になる。
 *
 * アルゴリズム的な見方（DI + 合成コンポーネント）：
 * 1. 外から categories と children を受け取る
 * 2. ModalContainer に children を “トリガー” として渡す
 * 3. content(closeModal) 内で、投稿作成モーダル UI を構築する
 * 4. closeModal を下流（PhotoCreateModal/PhotoCreateForm）に渡し、
 *    成功時・キャンセル時など任意のタイミングで閉じられるようにする
 */
export function PhotoCreateModalContainer({
  categories,
  children,
  toggleClassName,
}: Props) {
  return (
    /**
     * ModalContainer（汎用モーダル制御）
     *
     * toggleClassName:
     * - トリガーボタンに追加で付与するクラス名を渡す。
     *
     * content:
     * - モーダルが開いているときに描画する内容を “関数” で渡す。
     * - 引数 closeModal は ModalContainer 側が提供する「閉じる関数」。
     *
     * アルゴリズム的には：
     * - “状態（open/close）” は ModalContainer に委譲し、
     * - このコンテナは “開いたときに何を表示するか” の構築に専念している。
     */
    <ModalContainer
      toggleClassName={toggleClassName}
      content={(closeModal) => (
        /**
         * PhotoCreateModal（投稿作成モーダルの外枠）
         *
         * - close={closeModal} を渡すことで、
         *   モーダル枠側（×ボタン、背景クリック、キャンセルなど）から閉じられるようにする。
         *
         * アルゴリズム的には：
         * - “モーダルの制御関数（closeModal）” を UI コンポーネントへ注入している（DI）。
         */
        <PhotoCreateModal close={closeModal}>
          {/**
           * PhotoCreateForm（投稿作成フォーム本体）
           *
           * categories:
           * - 投稿時にカテゴリ選択が必要なので、フォームへカテゴリー一覧を渡す。
           *
           * close:
           * - 投稿成功後にモーダルを閉じたいので、フォームにも closeModal を渡す。
           * - これによりフォーム側で「送信成功 → close()」の流れを実装できる。
           *
           * アルゴリズム的には：
           * - “ドメイン入力（categories）” と “操作（close）” をフォームに渡し、
           *   フォームが投稿フロー（入力→送信→完了）を実行できるようにしている。
           */}
          <PhotoCreateForm categories={categories} close={closeModal} />
        </PhotoCreateModal>
      )}
    >
      {/**
       * children（モーダルを開くトリガー）
       *
       * - LayoutNavigation などの呼び出し元が渡した UI をそのまま表示する。
       * - ModalContainer 内部では children が button の中身になるので、
       *   クリック可能なトリガーとして機能する。
       *
       * アルゴリズム的には：
       * - “任意 UI → モーダルトリガー” への変換を共通化している。
       */}
      {children}
    </ModalContainer>
  );
}