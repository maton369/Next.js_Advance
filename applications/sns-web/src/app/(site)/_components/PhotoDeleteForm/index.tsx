"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertDialogModal } from "sns-shared-ui/src/components/AlertDialogModal";
import { Button } from "sns-shared-ui/src/components/Button";
import { deletePhotoAction } from "./actions";

/**
 * Props（PhotoDeleteForm が受け取る入力）
 *
 * id:
 * - 削除対象の写真ID。
 * - ここでの “削除” は「このIDのレコード（写真投稿）」を消すことを指す。
 *
 * closeModal:
 * - 削除完了後（またはキャンセル時）にモーダルを閉じるためのコールバック。
 * - モーダル UX では「成功したら閉じる」「キャンセルでも閉じる」が自然なため、
 *   外側（モーダルコンテナ）から渡してもらう。
 */
type Props = {
  id: string;
  closeModal: () => void;
};

/**
 * AlertDialogModalComponent（確認ダイアログの中身）
 *
 * 役割：
 * - “削除してよいか” の確認 UI を表示する
 * - 送信中（pending）状態に応じてメッセージとボタン状態を切り替える
 * - 初期フォーカスを「キャンセル」ボタンに当てる（誤操作防止 / A11y）
 *
 * 重要：
 * - useFormStatus は “form の子孫コンポーネント” で使う必要がある。
 *   そのため、フォームの中身を子コンポーネントに切り出している。
 *
 * アルゴリズム的な見方（状態 → メッセージ/操作の切替）：
 * 1. useFormStatus() から pending（送信中かどうか）を取得
 * 2. pending に応じて message を分岐（削除中 / 確認文）
 * 3. AlertDialogModal に messageNode/actionsNode を渡して描画
 * 4. キャンセルは type="button" で送信を抑止し、closeModal を実行
 * 5. OK は type="submit" で form 送信を発火し、pending 中は disabled にする
 */
function AlertDialogModalComponent({
  error,
  closeModal,
}: {
  /**
   * error:
   * - 削除処理に失敗した際のエラーメッセージ。
   * - これが存在する場合、通常の確認文や “削除中” 表示より優先して表示する。
   */
  error?: string;

  /**
   * closeModal:
   * - キャンセルボタン押下時にモーダルを閉じるための関数。
   */
  closeModal: () => void;
}) {
  /**
   * buttonRef（キャンセルボタンへの参照）
   *
   * - 初期フォーカスを当てるために useRef を使う。
   * - 削除確認ダイアログでは、デフォルトフォーカスを OK にすると誤操作で危険なので、
   *   “安全側（キャンセル）” をデフォルトにするのが UX 的に良い。
   */
  const buttonRef = useRef<HTMLButtonElement>(null);

  /**
   * 初期フォーカス制御
   *
   * - 初回マウント時にキャンセルボタンへ focus() する。
   * - buttonRef.current が無ければ何もしない。
   *
   * アルゴリズム的には：
   * - “UI が描画された直後に、操作開始点（フォーカス）を安全な場所へ移す” 処理。
   */
  useEffect(() => {
    if (!buttonRef.current) return;
    buttonRef.current.focus();
  }, []);

  /**
   * useFormStatus（フォーム送信状態の取得）
   *
   * pending:
   * - form action が実行されている最中（送信中）かどうかを表すフラグ。
   *
   * ★ コメントの意図：
   * - useFormStatus は form の “子” でしか効かないため、
   *   ここを form の内側に置く必要がある。
   */
  // ★ form 要素の子コンポーネントで使用する
  const { pending } = useFormStatus();

  /**
   * message（表示メッセージの切り替え）
   *
   * - pending の間は “削除しています” と表示して、
   *   ユーザーに処理中であることを伝える。
   * - 送信前（pending=false）の間は確認文を表示する。
   *
   * アルゴリズム的には：
   * - “状態（pending）” → “UI文言” への写像（条件分岐）である。
   */
  const message = pending
    ? `...削除しています`
    : `この写真を削除します\n本当によろしいですか？`;

  return (
    /**
     * AlertDialogModal（共有UIコンポーネント）
     *
     * messageNode:
     * - エラーがあればそれを優先して表示（error || message）。
     *
     * actionsNode:
     * - キャンセル：type="button"（submit しない）、closeModal で閉じる
     * - OK：type="submit"（form を送信する）、pending 中は disabled
     *
     * アルゴリズム的には：
     * - “状態/エラー” に応じて、ユーザーの次の行動（OK/キャンセル）の可否を制御している。
     */
    <AlertDialogModal
      messageNode={error || message}
      actionsNode={
        <>
          {/**
           * キャンセルボタン（安全側）
           *
           * type="button":
           * - デフォルトの submit 挙動を防ぐ（重要）。
           *
           * ref={buttonRef}:
           * - 初期フォーカスのための参照。
           *
           * onClick={closeModal}:
           * - 即座にダイアログを閉じる。
           */}
          <Button
            type="button"
            color="gray"
            ref={buttonRef}
            onClick={closeModal}
          >
            キャンセル
          </Button>

          {/**
           * OKボタン（削除実行）
           *
           * type="submit":
           * - form を送信し、form の action を実行する。
           *
           * disabled={pending}:
           * - 送信中は連打を防ぎ、二重送信の事故を抑える。
           */}
          <Button type="submit" disabled={pending}>
            OK
          </Button>
        </>
      }
    />
  );
}

/**
 * PhotoDeleteForm（削除確認 + Server Action 実行のフォーム）
 *
 * 役割：
 * - “削除する” という破壊的操作を、必ず確認ダイアログを挟んで実行する
 * - OK（submit）されたら deletePhotoAction を呼び、成功ならモーダルを閉じる
 * - 失敗なら error 状態を更新し、ダイアログ内にエラーを表示する
 *
 * 重要な設計ポイント：
 * - <form action={handleAction}> を利用しているため、
 *   “送信中” を useFormStatus で自然に拾える（pending 制御が簡単になる）。
 *
 * アルゴリズム的な見方（確認 → 送信 → 実行 → 成否分岐）：
 * 1. ユーザーが OK を押す（submit）
 * 2. form action（handleAction）が実行される
 * 3. deletePhotoAction(id) を呼ぶ（サーバ側で削除）
 * 4. 戻り値がエラーなら UI をエラー表示に切り替える
 * 5. 成功なら closeModal で閉じる
 */
export function PhotoDeleteForm({ id, closeModal }: Props) {
  /**
   * error（エラー状態）
   *
   * - deletePhotoAction の戻り値（err.message）を表示するための状態。
   * - undefined のときは通常メッセージ、値があるときは error を優先表示する。
   *
   * 注意：
   * - 成功後に closeModal するので、通常は “エラーを消す処理” は不要だが、
   *   再試行できる UX にするなら error をクリアするタイミング（送信開始時など）を検討してもよい。
   */
  const [error, setError] = useState<string>();

  /**
   * handleAction（form の action で呼ばれる送信処理）
   *
   * 【1】送信処理の開始：
   * - OK（submit）で発火し、削除処理を開始する。
   *
   * 【2】削除 Server Action を呼ぶ：
   * - deletePhotoAction(id) はサーバ側で削除を行う想定。
   * - ここでは “エラーがあれば返す” 形にしている（例外ではなく戻り値）。
   *
   * ★ コメントの意図：
   * - Server Action 経由で削除と revalidate/更新が適切に行われる前提なら、
   *   クライアント側で router.refresh() や router.push() を明示的に叩かなくても
   *   期待する UI 更新が成立しやすい。
   *
   * アルゴリズム的には：
   * - “非同期操作（削除）” の結果に応じて “UI状態（error/close）” を分岐させる。
   */
  // 【1】送信処理の開始
  const handleAction = async () => {
    // 【2】削除 Server Action を呼ぶ
    const err = await deletePhotoAction(id);

    /**
     * ★ router.refresh(); と router.push(); が不要
     *
     * - ルーティング主導（Parallel/Intercepting）のモーダルなら、
     *   成功時に closeModal（たとえば router.back()）で閉じるだけで
     *   背景（一覧）へ自然に戻れることが多い。
     * - さらに Server Action 側で revalidate/tag invalidation をしていれば、
     *   背景一覧が最新状態に更新される設計が可能。
     */

    if (err) {
      /**
       * 【9】戻り値がある場合はエラー文字切り替え
       *
       * - err.message を state に反映すると、
       *   AlertDialogModalComponent の messageNode が error を優先表示するため、
       *   そのままダイアログ内にエラーが出る。
       *
       * UX上の意味：
       * - 失敗してもモーダルは閉じず、同じ文脈で理由を示して再試行できる。
       */
      setError(err.message);
      return;
    }

    /**
     * 成功時：モーダルを閉じる
     *
     * - 破壊的操作は “成功したら即閉じる” がシンプルで分かりやすい。
     * - closeModal の実装は、モーダルコンテナ側で router.back() 等になっている想定。
     */
    closeModal();
  };

  return (
    /**
     * <form action={handleAction}>
     *
     * - Next.js / React の “フォーム action” を使って送信を制御している。
     * - OK（submit）時に handleAction が実行される。
     *
     * これにより：
     * - useFormStatus の pending が正しく動き、
     * - 送信中の UI 制御（disabled/文言切替）が簡潔になる。
     */
    <form action={handleAction}>
      {/**
       * hidden input（id の埋め込み）
       *
       * - ここでは handleAction が id をクロージャで参照しているため、実は必須ではない。
       * - ただし “フォームとしての意味” を持たせたい場合や、
       *   将来的に FormData を使う action に切り替える場合の布石として置くのはあり。
       */}
      <input type="hidden" name="id" value={id} />

      {/**
       * AlertDialogModalComponent（ダイアログ本体）
       *
       * - error を渡して、失敗時はエラー表示に切り替える。
       * - closeModal を渡して、キャンセルで閉じられるようにする。
       *
       * ★重要：
       * - useFormStatus を使う都合上、必ず form の内側に配置する。
       */}
      <AlertDialogModalComponent error={error} closeModal={closeModal} />
    </form>
  );
}