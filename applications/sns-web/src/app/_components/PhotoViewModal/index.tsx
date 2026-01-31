import { useId } from "react";
import Link from "next/link";
import { Heading } from "sns-shared-ui/src/components/Heading";
import { Typography } from "sns-shared-ui/src/components/Typography";
import { LikeButtonContainer } from "@/app/_components/LikeButtonContainer";
import type { Photo } from "@/services/type";
import styles from "./style.module.css";

/**
 * PhotoViewModalContent
 *
 * - このモーダルが表示する “写真コンテンツ” の型を Photo と同一にしている。
 * - つまり、写真のタイトル/説明/画像URL/いいね数など、表示に必要な情報は Photo が持つ前提。
 *
 * アルゴリズム的には：
 * - “表示対象ドメイン（Photo）” を “モーダルの入力” としてそのまま採用している。
 */
export type PhotoViewModalContent = Photo;

/**
 * Props（PhotoViewModal が受け取る入力）
 *
 * PhotoViewModalContent（= Photo）に加えて、UI 状態/操作を表す props を付与している。
 *
 * liked:
 * - 現在のユーザーが「すでにいいね済みか」を表すフラグ（UI制御に使用）
 *
 * close:
 * - モーダルを閉じる操作（外側の ModalContainer から注入される）
 *
 * onClickLike:
 * - いいね操作が成功した後などに呼ぶコールバック
 * - 引数 count は更新後の likedCount を想定
 *
 * アルゴリズム的には：
 * - “表示データ（Photo）” と “状態（liked）” と “操作（close/onClickLike）” を合成した入力。
 */
type Props = PhotoViewModalContent & {
  liked: boolean;
  close: () => void;
  onClickLike: (count: number) => void;
};

/**
 * PhotoViewModal（写真詳細モーダル）
 *
 * 役割：
 * - 写真を大きく表示し、いいねボタンとタイトル/説明を見せる
 * - overlay クリックで閉じられるようにする
 * - アクセシビリティ（role/dialog, aria-*）を付け、スクリーンリーダーに説明できるようにする
 *
 * アルゴリズム的な見方（表示 + イベント + A11y ID 生成）：
 * 1. useId() で “このモーダル固有のID” を生成する（複数モーダルでも衝突しない）
 * 2. titleId/descriptionId を組み立てて aria-labelledby / aria-describedby に渡す
 * 3. overlay クリック → close() を呼び、モーダルを閉じる
 * 4. LikeButtonContainer を介して「いいね」操作を実行し、結果を onClickLike に流す
 * 5. Footer にタイトル（Link）と説明文を表示する
 */
export function PhotoViewModal({ liked, close, onClickLike, ...photo }: Props) {
  /**
   * useId（安定したユニークIDの生成）
   *
   * - React 18 以降の useId は “同一ツリー内で衝突しない ID” を生成できる。
   * - SSR/CSR 間での整合も考慮されており、aria 属性の参照先 ID に使うのに向いている。
   *
   * アルゴリズム的には：
   * - “DOM内参照（aria-*）のためのキー” を生成するステップ。
   */
  const modalId = useId();

  /**
   * aria 用 ID の組み立て
   *
   * - aria-labelledby / aria-describedby で参照するために、
   *   “タイトル用”“説明用”の ID を派生させる。
   *
   * 例：
   * - modalId = "r0:..." のような値
   * - titleId = "r0:...-title"
   * - descriptionId = "r0:...-description"
   *
   * アルゴリズム的には：
   * - “基底ID（modalId）” から “意味付きID（title/description）” を派生生成している。
   */
  const titleId = modalId + "-title";
  const descriptionId = modalId + "-description";

  return (
    /**
     * styles.modal（モーダル全体の外枠）
     *
     * - overlay と dialog をまとめるラッパー。
     * - position: fixed / z-index / 画面中央配置などを担う想定。
     */
    <div className={styles.modal}>
      {/**
       * overlay（背景の暗幕）
       *
       * - モーダル外側の領域をクリックしたら閉じる UX を実現する。
       *
       * onClick={close}:
       * - close() は外側（ModalContainer）から注入された “閉じる関数”。
       *
       * アルゴリズム的には：
       * - “ユーザー入力（背景クリック）” → “状態遷移（Open→Closed）” のトリガー。
       */}
      <div className={styles.overlay} onClick={close} />

      {/**
       * dialog（モーダルの本体）
       *
       * role="dialog" / aria-modal="true":
       * - ここがダイアログであることを支援技術に伝える。
       *
       * aria-labelledby / aria-describedby:
       * - ダイアログの “タイトル” と “説明” を指し示す。
       * - これにより、スクリーンリーダーが内容を把握しやすくなる。
       *
       * className={styles.dialog}:
       * - サイズ、角丸、影、内部レイアウトなどを CSS Modules で管理する想定。
       */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={styles.dialog}
      >
        {/**
         * photo（写真表示領域）
         *
         * - 画像は <img> ではなく background-image で表示している。
         * - これにより “全面背景としてトリミング/cover” などを CSS で制御しやすい。
         *
         * style={{ backgroundImage: `url(${photo.imageUrl})` }}:
         * - Photo の imageUrl を背景として適用する。
         *
         * アルゴリズム的には：
         * - “ドメインデータ（imageUrl）” を “見た目の属性（backgroundImage）” に変換している。
         */
        <div
          className={styles.photo}
          style={{ backgroundImage: `url(${photo.imageUrl})` }}
        >
          {/**
           * LikeButtonContainer（いいねボタンの制御コンテナ）
           *
           * id:
           * - “どの写真に対するいいねか” を一意に特定するキー。
           *
           * count:
           * - 現在のいいね数。
           * - ここでは photo.likedCount を渡しているため、外側（PhotoViewModalContainer）が
           *   state で更新した likedCount を props に載せて渡している設計が前提になる。
           *
           * disabled={liked}:
           * - すでにいいね済みならボタンを押せないようにする UI 制御。
           * - 二重送信防止として機能する（ただし最終的な制御はサーバ側でも必要）。
           *
           * onClickLike:
           * - いいね成功後の “更新後 count” を親へ返すためのコールバック。
           *
           * アルゴリズム的には：
           * - “写真ID + 現在状態（liked/count）” を入力として、
           *   “いいね操作” を実行し、結果（新しいcount）を上流へ伝播する。
           */
          <LikeButtonContainer
            id={photo.id}
            className={styles.likeButton}
            count={photo.likedCount}
            disabled={liked}
            onClickLike={onClickLike}
          />
        </div>

        {/**
         * footer（テキスト情報の表示領域）
         *
         * - タイトル（Heading + Link）と説明文（Typography）をまとめる。
         * - aria-labelledby / aria-describedby の参照先にもなるので、
         *   id={titleId} / id={descriptionId} を付与している。
         */}
        <footer className={styles.footer}>
          {/**
           * Heading（タイトル）
           *
           * - id={titleId} により aria-labelledby の参照先になる。
           * - Link にすることで、モーダルから通常の詳細ページへ遷移できる導線を作っている。
           *
           * アルゴリズム的には：
           * - “モーダル内のタイトル” を “ページ遷移の入口” として再利用している。
           */}
          <Heading level={2} id={titleId} className={styles.title}>
            <Link href={`/photos/${photo.id}`}>{photo.title}</Link>
          </Heading>

          {/**
           * Typography（説明文）
           *
           * - id={descriptionId} により aria-describedby の参照先になる。
           * - photo.description を表示する。
           *
           * アルゴリズム的には：
           * - “ドメインデータ（description）” を “表示用テキスト” に投影する工程。
           */}
          <Typography id={descriptionId} className={styles.description}>
            {photo.description}
          </Typography>
        </footer>
      </div>
    </div>
  );
}