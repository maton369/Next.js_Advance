"use client";

import { createContext, useRef } from "react";

/**
 * PhotoIdsContext（写真ID一覧を共有するための Context）
 *
 * 目的：
 * - “写真拡大表示モーダル” で、キーボード操作（次/前へ移動）を実現したい。
 * - そのためには「今表示候補になっている写真IDの並び（一覧）」が必要になる。
 * - しかし、その一覧は「背景ページ（一覧）」「モーダル（詳細）」「ナビゲーション制御」など、
 *   複数のコンポーネントがまたいで参照・更新したくなる。
 *
 * そこで React Context を使い、写真ID一覧を “ツリー全体で共有できる状態” として提供する。
 *
 * なぜ "use client" が必要か：
 * - createContext/useRef はクライアントコンポーネントで使う Hooks/機能であるため。
 *
 * この Context の型：
 * - React.MutableRefObject<readonly string[]>
 *
 * つまり：
 * - value は { current: readonly string[] } という形
 * - current に “写真IDの配列” が入る
 *
 * “Ref で持つ” のが重要で、State（useState）と違い：
 * - current を更新しても “Provider 配下を再レンダリングしない”
 * - 一覧の更新頻度が高い・広範囲に影響させたくないときに有利
 *
 * アルゴリズム的には：
 * - “共有データ（写真ID列）” を re-render のトリガーにせず保持し、
 *   必要な箇所だけが参照してナビゲーション計算に使えるようにしている。
 */
export const PhotoIdsContext = createContext<
  React.MutableRefObject<readonly string[]>
>({
  /**
   * default value（Provider が無い場合のフォールバック）
   *
   * - 通常は Provider を必ず上位に置く前提なので、この値は実際には使われないことが多い。
   * - ただし、Provider を置き忘れた場合でも code が落ちにくいように、
   *   current: [] を初期値として与えている。
   *
   * 注意：
   * - Provider が無い状態で参照すると “常に空配列” となり、
   *   ナビゲーションが効かない（次/前が見つからない）挙動になり得る。
   */
  current: [],
});

/**
 * PhotoIdsContextProvider（Context Provider コンポーネント）
 *
 * 役割：
 * - photoIdsRef を 1 つ生成し、それを Context に流す。
 * - 配下のコンポーネントは useContext(PhotoIdsContext) で参照できるようになる。
 *
 * “Ref を Provider の value にする” ことの意味：
 * - value が “参照（オブジェクト）として固定” されるので、
 *   Provider の value 自体は基本変化しない（= 不要な再レンダリングが起きにくい）。
 * - 配下は photoIdsRef.current を読めば最新の ID 列を参照できる。
 *
 * アルゴリズム的な見方（共有メモリとしての Ref）：
 * 1. Provider が “共有メモリ（photoIdsRef）” を用意する
 * 2. 一覧ページなどが photoIdsRef.current を更新する（例：表示中のカード順）
 * 3. モーダルやナビゲーターが photoIdsRef.current を読んで次/前を計算する
 * 4. 計算結果を元に router.push / Intercepting Route で表示を切り替える
 */
export function PhotoIdsContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * photoIdsRef（写真ID一覧の実体）
   *
   * 初期値：
   * - 空配列 []
   *
   * 型：
   * - readonly string[] としているので、配列自体を直接破壊的に変更する（push など）よりも、
   *   “新しい配列を代入する” 運用が自然になる。
   *
   * 例：
   * - photoIdsRef.current = ["a", "b", "c"]; // OK
   *
   * アルゴリズム的には：
   * - “状態” ではなく “参照” として保持し、更新コスト（再レンダリング）を抑える。
   */
  const photoIdsRef = useRef<readonly string[]>([]);

  return (
    /**
     * Context.Provider（配下へ共有状態を配る）
     *
     * value に photoIdsRef を渡すことで、
     * - 配下コンポーネントは同じ参照（photoIdsRef）を共有できる。
     * - photoIdsRef.current を更新すれば、どこからでも最新の一覧が見える。
     */
    <PhotoIdsContext.Provider value={photoIdsRef}>
      {/**
       * children（Provider 配下に含めたい UI）
       *
       * - SiteLayout の最上段に置くことで、
       *   背景ページ / モーダル / ナビゲーターなど
       *   すべてが同じ PhotoIdsContext を参照できるようになる。
       */}
      {children}
    </PhotoIdsContext.Provider>
  );
}