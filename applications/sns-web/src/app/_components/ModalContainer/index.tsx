"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { useModal } from "@/app/_hooks/useModal";
import styles from "./style.module.css";

/**
 * ModalContainer（モーダル制御の共通ラッパー）
 *
 * 役割：
 * - 任意の UI（children）を「モーダルを開くトリガー（ボタン）」として包む
 * - open/close の状態管理を useModal に委譲し、表示分岐（isOpen）を行う
 * - content を “関数として受け取り”、closeModal を注入してモーダル内容に渡す
 *
 * なぜ "use client" が必要か：
 * - クリックイベント（onClick）と state（isOpen）を扱うため、Client Component が必要。
 *
 * アルゴリズム的な見方（状態機械 + 条件付きレンダリング）：
 * 1. defaultOpen を初期状態として useModal を初期化する
 * 2. children を包んだボタンを描画する（トリガー）
 * 3. ボタンがクリックされたら openModal を実行して isOpen を true にする
 * 4. isOpen が true の間だけ content(closeModal) をレンダリングする（モーダル表示）
 * 5. モーダル側が closeModal を呼べば isOpen が false になり、モーダルが消える
 */
export function ModalContainer({
  children,
  content,
  defaultOpen = false,
  toggleClassName,
}: {
  /**
   * children（トリガーとして表示する内容）
   *
   * - ボタンの中身として描画される。
   * - 例：画像カード、アイコン、テキストなど、任意の UI をトリガーにできる。
   *
   * アルゴリズム的には：
   * - “任意の UI” を “モーダル起動スイッチ” として再利用できるよう一般化している。
   */
  children: ReactNode;

  /**
   * content（モーダルとして表示する内容）
   *
   * - 関数として受け取り、引数に closeModal を渡す形にしている。
   * - これにより、モーダル内部のコンポーネントが「閉じる」操作を実行できる。
   *
   * アルゴリズム的には：
   * - “制御関数（closeModal）” を “描画するコンテンツ” へ注入する依存性注入（DI）。
   */
  content: (closeModal: () => void) => ReactNode;

  /**
   * defaultOpen（初期状態）
   *
   * - true を渡すと初期表示からモーダルが開いた状態になる。
   * - 省略時は false（閉じた状態）。
   *
   * ユースケース：
   * - URL遷移直後にモーダルを開きたい
   * - 初回チュートリアルなどで最初から開く
   */
  defaultOpen?: boolean;

  /**
   * toggleClassName（トリガーボタンに追加するクラス）
   *
   * - styles.toggle に加えて、呼び出し元が任意のクラスを足せる。
   * - 例：カード表示のときだけサイズ/余白を変えたいなど。
   *
   * clsx を使うことで undefined でも安全に結合できる。
   */
  toggleClassName?: string;
}) {
  /**
   * useModal（モーダル状態の管理）
   *
   * - defaultOpen を初期値として、
   *   - openModal: 開く
   *   - closeModal: 閉じる
   *   - isOpen: 開閉状態
   *   を受け取る。
   *
   * アルゴリズム的には：
   * - “モーダルの状態機械（Open/Close）” を hooks に切り出し、
   *   UI コンポーネントはその状態に従って描画するだけにしている。
   */
  const { openModal, closeModal, isOpen } = useModal(defaultOpen);

  return (
    <>
      {/**
       * トリガーボタン
       *
       * - children をボタンの中に描画することで、
       *   “children をクリックするとモーダルが開く” を実現する。
       *
       * onClick={openModal}:
       * - クリックイベントを openModal に接続し、isOpen を true にする。
       *
       * className:
       * - styles.toggle（共通スタイル）に、必要なら toggleClassName を追加する。
       * - clsx は文字列/undefined を安全に結合できるユーティリティ。
       *
       * 注意（アクセシビリティ/仕様次第）：
       * - children が <a> などの場合、ボタンの中に入ることの意味を考慮する必要がある。
       * - ここでは “トリガーは必ずボタンである” と決め打ちしている設計。
       */}
      <button
        onClick={openModal}
        className={clsx(styles.toggle, toggleClassName)}
      >
        {children}
      </button>

      {/**
       * モーダル本体の描画（条件付きレンダリング）
       *
       * - isOpen が true のときだけ content(closeModal) を描画する。
       * - false なら何も描画されない（モーダルは存在しない）。
       *
       * content(closeModal) の意味：
       * - content は関数なので、ここで closeModal を渡して “モーダル内で閉じられる” ようにする。
       *
       * アルゴリズム的には：
       * - “状態（isOpen）” によって “存在する UI” を切り替えるガード（if）そのもの。
       * - React における典型的な有限状態（Open/Closed）表示の実装。
       */}
      {isOpen && content(closeModal)}
    </>
  );
}