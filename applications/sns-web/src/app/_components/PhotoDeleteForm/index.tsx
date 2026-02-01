import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialogModal } from "sns-shared-ui/src/components/AlertDialogModal";
import { Button } from "sns-shared-ui/src/components/Button";

/**
 * Props（PhotoDeleteForm が受け取る入力）
 *
 * id:
 * - 削除対象の写真ID。
 * - このIDを使って `/api/photos/${id}` へ DELETE リクエストを投げる。
 *
 * closeModal:
 * - 現在表示中のモーダル（削除確認）を閉じるためのコールバック。
 * - 削除成功後は遷移するので UI 的には “閉じたように見える” が、
 *   画面構造によっては明示的に closeModal が必要な場合がある。
 */
type Props = {
  id: string;
  closeModal: () => void;
};

/**
 * AlertDialogModalComponent（確認ダイアログの UI 部分）
 *
 * 役割：
 * - “削除してよいか” を確認するダイアログを表示する
 * - 送信中（isSubmitting）かどうかで、メッセージ/ボタン状態を切り替える
 * - 初期フォーカスを「キャンセル」に当て、誤操作を避ける（UX/A11y）
 *
 * このコンポーネントは “フォームの送信状態” を外から受け取り、
 * 表示と操作制御だけに集中する設計になっている。
 *
 * アルゴリズム的な見方（状態→UI変換）：
 * 1. isSubmitting を入力として受け取る
 * 2. isSubmitting に応じて message を分岐
 * 3. OK ボタンの disabled を isSubmitting に同期
 * 4. キャンセルは closeModal を呼ぶ（送信とは独立）
 */
function AlertDialogModalComponent({
  isSubmitting,
  error,
  closeModal,
}: {
  /**
   * isSubmitting:
   * - 親（PhotoDeleteForm）が管理する “送信中フラグ”。
   * - true の間は二重送信防止のため OK ボタンを disabled にする。
   */
  isSubmitting: boolean;

  /**
   * error:
   * - 送信が失敗した際のエラーメッセージ。
   * - 存在する場合、通常メッセージより優先して表示する。
   */
  error?: string;

  /**
   * closeModal:
   * - キャンセル押下時にモーダルを閉じるための関数。
   */
  closeModal: () => void;
}) {
  /**
   * buttonRef（キャンセルボタンへの参照）
   *
   * - 初期フォーカスを当てるために useRef を利用する。
   * - 破壊的操作（削除）のダイアログでは、
   *   デフォルトフォーカスを OK にしないことで誤削除を防ぎやすい。
   */
  const buttonRef = useRef<HTMLButtonElement>(null);

  /**
   * 初期フォーカス制御
   *
   * - マウント直後にキャンセルボタンへ focus() を当てる。
   * - buttonRef.current が null の場合は何もしない。
   *
   * アルゴリズム的には：
   * - “UIの入口（フォーカス）を安全側へ誘導する” 副作用。
   */
  useEffect(() => {
    if (!buttonRef.current) return;
    buttonRef.current.focus();
  }, []);

  /**
   * message（表示メッセージの切替）
   *
   * - isSubmitting=true の間は “削除しています” を表示し、
   *   ユーザーに処理中であることを明示する。
   * - 送信前は確認メッセージを表示する。
   *
   * アルゴリズム的には：
   * - 状態（isSubmitting）を UI 文言へ写像する条件分岐。
   */
  const message = isSubmitting
    ? `...削除しています`
    : `この写真を削除します\n本当によろしいですか？`;

  return (
    /**
     * AlertDialogModal（共有UI）
     *
     * messageNode:
     * - error があれば優先し、無ければ通常 message を出す。
     *
     * actionsNode:
     * - キャンセル：type="button"（submit しない）で closeModal
     * - OK：type="submit"（form送信）で、isSubmitting 中は disabled
     *
     * ここで OK が type="submit" になっていることで、
     * 親の <form onSubmit={handleAction}> が発火する。
     */
    <AlertDialogModal
      messageNode={error || message}
      actionsNode={
        <>
          {/**
           * キャンセルボタン
           *
           * - type="button" にしないと、button が submit 扱いになり送信され得るため重要。
           * - ref は初期フォーカス用。
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
           * - type="submit" でフォーム送信を発火させる。
           * - isSubmitting 中は disabled にして二重送信を防ぐ。
           */}
          <Button type="submit" disabled={isSubmitting}>
            OK
          </Button>
        </>
      }
    />
  );
}

/**
 * PhotoDeleteForm（削除処理を実行するフォーム）
 *
 * 役割：
 * - ユーザーが OK を押したときに、削除 API（Route Handler）へ DELETE を投げる
 * - 成功したら画面の整合性を取るために refresh し、profile へ遷移する
 * - 失敗したらエラーメッセージを表示して、同じモーダル内で再試行できるようにする
 *
 * この実装は “Server Action ではなく Route Handler を fetch で呼ぶ” 方式であり、
 * 送信中の状態（isSubmitting）をクライアント側で自前管理しているのが特徴。
 *
 * アルゴリズム的な見方（確認→送信→成否分岐→画面更新）：
 * 1. submit が発生する
 * 2. event.preventDefault() で通常送信を止める
 * 3. 二重送信チェック（isSubmitting）→ 送信中なら return
 * 4. isSubmitting=true にして UI を “処理中” に切り替える
 * 5. DELETE リクエストを投げ、失敗なら例外として扱う
 * 6. 成功したら router.refresh() で現在のキャッシュ/描画を更新
 * 7. router.push("/profile") で遷移して “削除後の着地点” を固定
 * 8. 失敗なら error state を更新してメッセージを差し替える
 * 9. finally で isSubmitting=false に戻す
 * 10. closeModal() を呼んで UI を閉じる（※ただし遷移との順序に注意）
 */
export function PhotoDeleteForm({ id, closeModal }: Props) {
  /**
   * router（Next.js App Router のナビゲーション操作）
   *
   * router.refresh():
   * - 現在のルートを再検証・再描画させる。
   * - 削除後に “一覧/詳細の表示が古いまま” になるのを防ぐ用途。
   *
   * router.push("/profile"):
   * - 成功後に profile ページへ遷移する。
   * - “削除完了後は一覧に戻したい” という UX を実現する。
   */
  const router = useRouter();

  /**
   * error（失敗時のメッセージ）
   *
   * - DELETE が失敗した場合のエラーメッセージを保持する。
   * - AlertDialogModalComponent に渡すことで、ダイアログ内に表示される。
   */
  const [error, setError] = useState<string>();

  /**
   * isSubmitting（送信中フラグ）
   *
   * - OK ボタンの disabled と “削除中メッセージ” の切替に使う。
   * - 二重送信ガードにも使う（クリック連打で複数DELETEが飛ばないようにする）。
   */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * handleAction（フォーム送信ハンドラ）
   *
   * event.preventDefault():
   * - ブラウザ標準のフォーム送信（ページリロードなど）を止め、
   *   React 側で非同期処理として扱う。
   *
   * 二重送信ガード：
   * - isSubmitting が true なら return して何もしない。
   *
   * try/catch/finally：
   * - 失敗は catch で拾い、メッセージを error state に反映する。
   * - finally で必ず isSubmitting を false に戻す。
   */
  // 【1】送信処理の開始
  const handleAction = async (event: FormEvent<HTMLFormElement>) => {
    /**
     * デフォルト送信を停止
     *
     * - SPA 的に処理したいのでページ遷移やリロードを起こさない。
     */
    event.preventDefault();

    /**
     * 二重送信防止
     *
     * - 送信中に再度 submit が来たら無視する。
     * - UI だけでなくロジックでも防ぐことで堅牢になる。
     */
    if (isSubmitting) return;

    /**
     * 送信開始：UI を “処理中” 状態に切り替える
     *
     * - OK ボタン disabled
     * - メッセージが “削除しています” に切り替わる
     */
    setIsSubmitting(true);

    try {
      /**
       * 【2】削除 Route Handler を呼ぶ
       *
       * - `/api/photos/${id}` に DELETE を送る。
       * - Route Handler 側で DB などから該当写真を削除する想定。
       *
       * then の中で res.ok を確認し、失敗なら例外化して catch に流す。
       *
       * アルゴリズム的には：
       * - “削除要求” → “HTTP結果” を受け取り、
       *   OK/NG を分岐させる工程。
       */
      await fetch(`/api/photos/${id}`, { method: "DELETE" }).then((res) => {
        if (!res.ok) throw new Error("削除に失敗しました");
        return res.json();
      });

      /**
       * router.refresh()
       *
       * - 削除直後の画面がキャッシュされたままだと、
       *   “削除したはずなのにまだ見える” 体験になる可能性がある。
       * - refresh により、現在の表示やデータを最新に寄せる。
       *
       * 注意：
       * - この直後に router.push するので、
       *   refresh がどこまで効くかは構成次第（遷移先を最新にする狙いなら push 先での再取得が本筋）。
       */
      router.refresh();

      /**
       * 【9】成功した場合、profile へ遷移
       *
       * - “削除後の着地点” を固定することで、
       *   ユーザーが迷子にならない UX になる。
       * - ここで push すると、モーダル表示状態も解消されやすい。
       */
      router.push("/profile");
    } catch (err) {
      /**
       * 失敗時：メッセージを切り替える
       *
       * - err が Error でなければ再スロー（未知のエラーは握り潰さない）。
       * - Error の場合は message を state に入れ、ダイアログ表示をエラー文に切り替える。
       *
       * アルゴリズム的には：
       * - “例外” → “ユーザーに見せるエラー表示” への変換。
       */
      if (!(err instanceof Error)) throw err;
      setError(err.message);
      return;
    } finally {
      /**
       * 送信完了：送信中フラグを解除
       *
       * - 成功/失敗のどちらでも実行される。
       * - UI を通常状態に戻す（ボタンの disabled を解除、文言を通常へ戻す）。
       */
      setIsSubmitting(false);
    }

    /**
     * モーダルを閉じる
     *
     * - 成功時に実行される（catch では return しているため）。
     *
     * 注意：
     * - router.push と closeModal の順序は UI 構成次第で影響する可能性がある。
     *   ただ、遷移が走るなら closeModal なしでも結果的に閉じることが多い。
     *   それでも “確実に閉じたい” なら closeModal を呼ぶ設計は妥当。
     */
    closeModal();
  };

  return (
    /**
     * <form onSubmit={handleAction}>
     *
     * - OK ボタン（type="submit"）で submit を発火させ、handleAction を実行する。
     * - Server Action を使わない構成なので、ここでは onSubmit で自前実装している。
     */
    <form onSubmit={handleAction}>
      <AlertDialogModalComponent
        isSubmitting={isSubmitting}
        error={error}
        closeModal={closeModal}
      />
    </form>
  );
}