"use client";

import { useEffect, useContext } from "react";
import { PhotoIdsContext } from "./provider";

/**
 * PhotoIdsContainer（写真ID一覧を Context の Ref に同期するコンテナ）
 *
 * 目的：
 * - 背景ページ（一覧）で表示している “写真カードの並び” を、モーダル側のナビゲーションに渡したい。
 * - そのために、表示中の photoIds（順序付き）を PhotoIdsContext（useRef）へ書き込む。
 *
 * 重要ポイント：
 * - PhotoIdsContext の value は `MutableRefObject<readonly string[]>`（= { current: [...] }）
 * - ここでは useEffect を使って、コンポーネントのライフサイクルに合わせて
 *   - mount / update: current に photoIds をセット
 *   - unmount: current を空配列に戻す
 *   という “同期” を行っている。
 *
 * なぜ "use client" が必要か：
 * - useEffect/useContext はクライアントコンポーネントでのみ使えるため。
 *
 * アルゴリズム的な見方（状態共有の同期処理）：
 * 1. 入力として photoIds（表示順の ID 列）を受け取る
 * 2. Context から共有 Ref（photoIdsRef）を取得する
 * 3. effect で photoIdsRef.current = photoIds を行い、共有状態を更新する
 * 4. アンマウント時に current を空にして、古い状態が残ることを防ぐ
 *
 * これにより PhotoViewNavigator などは、常に “今の画面で有効な ID 列” を参照して
 * 次/前の写真を計算できる。
 */
export function PhotoIdsContainer({
  photoIds,
  children,
}: {
  /**
   * photoIds（この画面で表示している写真IDの順序付き配列）
   *
   * readonly にしている意図：
   * - 呼び出し側が “破壊的変更（push/splice）” をしにくくする
   * - 「表示順のスナップショット」として扱う
   *
   * ここで渡す配列の順序が、そのまま “次/前ナビゲーションの順序” になる想定。
   */
  photoIds: readonly string[];

  /**
   * children（このコンテナが包む UI）
   *
   * - 通常は、写真カードの一覧（Link + PhotoCard の列など）が入る。
   * - ここでは “見た目を変える” のではなく、“共有状態をセットする副作用” を持つだけなので、
   *   children をそのまま返す。
   */
  children: React.ReactNode;
}) {
  /**
   * photoIdsRef（Context から取得した共有 Ref）
   *
   * - Provider 側で useRef([]) された “共有メモリ” を参照する。
   * - photoIdsRef.current を更新しても、React の再レンダリングは基本起きない。
   *
   * アルゴリズム的には：
   * - “全体で共有する参照（ポインタ）” を手元に取り出して操作している。
   */
  const photoIdsRef = useContext(PhotoIdsContext);

  /**
   * useEffect による同期（mount/update/unmount）
   *
   * この effect は photoIds または photoIdsRef が変わったときに走る。
   *
   * mount / update 時：
   * - photoIdsRef.current = photoIds;
   *   → 共有 Ref に最新の一覧順を格納する。
   *
   * cleanup（unmount 時 or 依存変化で再実行前）：
   * - photoIdsRef.current = [];
   *   → 古い一覧が残って “別画面なのに前の ID 列でナビゲーションしてしまう”
   *     といった事故を防ぐ。
   *
   * なぜ effect にしているか：
   * - “描画中に ref を書き換える” こともできなくはないが、
   *   React 的には副作用は effect に寄せる方が意図が明確になる。
   *
   * 依存配列：
   * - [photoIdsRef, photoIds]
   *
   * - photoIdsRef は通常 Provider が同じなら参照は固定だが、型的に依存に入れておくのは安全。
   * - photoIds はページングやフィルタ変更で中身が変わるので依存に入れるべき。
   *
   * アルゴリズム的には：
   * - “入力（photoIds）の変更” をトリガーに、共有メモリ（Ref）を更新する同期ループ。
   */
  useEffect(() => {
    /**
     * 共有 Ref へ現在の photoIds を反映
     *
     * - この代入により、ナビゲータ側は常に最新の ID 列を参照できる。
     */
    photoIdsRef.current = photoIds;

    /**
     * cleanup：このコンテナが外れたとき（または再実行直前）に共有 Ref を初期化
     *
     * - “前の画面の ID 列” が残ると、モーダルで次/前を押したときに
     *   予期せぬ ID へ飛ぶ可能性がある。
     * - それを避けるため、空配列に戻しておく。
     */
    return () => {
      photoIdsRef.current = [];
    };
  }, [photoIdsRef, photoIds]);

  /**
   * children をそのまま返す
   *
   * - このコンテナの主目的は “副作用で Context に写真ID一覧を同期すること” であり、
   *   DOM 構造やスタイルを追加しない。
   *
   * 注意：
   * - React コンポーネントは ReactNode を返せるので、ラッパー要素無しでも成立する。
   */
  return children;
}