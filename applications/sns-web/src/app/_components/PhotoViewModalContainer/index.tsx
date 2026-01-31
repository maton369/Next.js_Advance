"use client";

import { useState, type ReactNode } from "react";
import type { Photo } from "@/services/type";
import { ModalContainer } from "../ModalContainer";
import { PhotoViewModal } from "../PhotoViewModal";

/**
 * PhotoViewModalContainer（写真カードなどをクリックしたときにモーダルで詳細表示するためのラッパー）
 *
 * 役割：
 * - 子要素（children）を「モーダルを開くトリガー」として扱い、
 *   クリック等の操作で PhotoViewModal を表示できるようにする。
 * - さらに、モーダル内の「いいね操作」による UI 状態（liked / likedCount）を
 *   ローカル state として保持し、即時反映できるようにする。
 *
 * なぜ "use client" が必要か：
 * - useState を使って UI 状態を持つため、Client Component である必要がある。
 *
 * アルゴリズム的な見方（UI状態付きデコレータ）：
 * 1. 入力として photo と children を受け取る
 * 2. liked / localLikedCount を state として初期化する
 * 3. “モーダル表示” という振る舞いを ModalContainer に委譲しつつ、
 *    モーダル内に渡す props（liked, likedCount, onClickLike, close）を組み立てる
 * 4. onClickLike が呼ばれたら state を更新し、モーダル表示を即時に変化させる
 */
export function PhotoViewModalContainer({
  /**
   * props の分割代入（likedCount だけ別扱い）
   *
   * - Photo 型の中から likedCount を取り出し、それ以外を `photo` にまとめている。
   * - こうすることで、PhotoViewModal へは
   *   - “元の photo 情報” は {...photo} でまとめて渡し
   *   - “likedCount はローカル state（localLikedCount）で上書きして渡す”
   *   という構造を作れる。
   *
   * アルゴリズム的には：
   * - 入力データを “固定部分” と “状態により変わる部分” に分割している。
   */
  photo: { likedCount, ...photo },
  children,
}: {
  photo: Photo;
  children: ReactNode;
}) {
  /**
   * liked（いいね済みフラグ）
   *
   * - モーダル内で「いいね」ボタンを押したかどうかを UI 表示に反映するための state。
   * - 初期値は false（まだ押していない）。
   *
   * 注意：
   * - 実際にサーバ側で “すでにいいね済み” を持っているなら、その初期値を props で渡して
   *   useState の初期値に反映する設計もあり得る。
   */
  const [liked, setLiked] = useState(false);

  /**
   * localLikedCount（ローカルのいいね数）
   *
   * - photo.likedCount（サーバから来た初期値）を元に state を初期化し、
   *   いいね操作後はローカルで値を更新して即時反映する。
   *
   * ここで `likedCount` を初期値にしている点が重要で、
   * - 初期描画はサーバから来た数値
   * - いいね操作後はローカル state の数値
   * という “段階的上書き” ができる。
   */
  const [localLikedCount, setLocallikedCount] = useState(likedCount);

  /**
   * handleClickLike（モーダル内の Like 操作ハンドラ）
   *
   * 引数 count：
   * - いいね操作後の “新しい likedCount” を受け取る想定。
   * - PhotoViewModal 側で API 呼び出し後の結果（更新後カウント）を渡してくる設計が考えられる。
   *
   * このハンドラがやっていること：
   * 1. liked を true にする（ボタンの見た目や状態を更新）
   * 2. localLikedCount を新しい count に置き換える
   *
   * アルゴリズム的には：
   * - “イベント（Likeクリック）” を “状態遷移（liked=false→true, count更新）” に変換する関数。
   */
  const handleClickLike = (count: number) => {
    setLiked(true);
    setLocallikedCount(count);
  };

  return (
    /**
     * ModalContainer（モーダル制御の共通コンテナ）
     *
     * - モーダルの開閉やフォーカス制御などの面倒な部分を ModalContainer に委譲する想定。
     * - このコンポーネントは「モーダルの中身（content）」と「トリガー（children）」を渡すだけ。
     *
     * content:
     * - 関数として渡しており、ModalContainer から closeModal 関数を受け取る。
     * - closeModal を PhotoViewModal に close として渡すことで、
     *   モーダル内部の UI から閉じられるようになる。
     *
     * アルゴリズム的には：
     * - “モーダル開閉の制御関数（closeModal）” を
     *   “モーダル内容コンポーネント（PhotoViewModal）” に注入する依存性注入（DI）の形。
     */
    <ModalContainer
      content={(closeModal) => (
        /**
         * PhotoViewModal（モーダル表示本体）
         *
         * {...photo}:
         * - likedCount を除いた photo の情報（タイトル、画像URL、説明など）をまとめて渡す。
         *
         * likedCount={localLikedCount}:
         * - サーバ初期値ではなく、ローカル state の値を使う。
         * - いいね操作で UI を即時更新できる。
         *
         * liked={liked}:
         * - “すでにいいね済みか” をモーダル側の表示制御に渡す。
         *
         * close={closeModal}:
         * - モーダルを閉じる関数。
         *
         * onClickLike={handleClickLike}:
         * - Like ボタン押下時に呼ばれるコールバック。
         *
         * アルゴリズム的には：
         * - “表示用の入力（photo）” と “状態（liked/localLikedCount）” と “操作（close/onClickLike）”
         *   を合成して PhotoViewModal に渡している。
         */
        <PhotoViewModal
          {...photo}
          likedCount={localLikedCount}
          liked={liked}
          close={closeModal}
          onClickLike={handleClickLike}
        />
      )}
    >
      {/**
       * children（モーダルを開くトリガー）
       *
       * - 例えば PhotoCard を children に渡すと、
       *   “PhotoCard をクリックしたら詳細モーダルが開く” という UX を作れる。
       *
       * アルゴリズム的には：
       * - “任意の UI 要素” を “モーダルトリガー” として再利用可能にする一般化。
       */}
      {children}
    </ModalContainer>
  );
}