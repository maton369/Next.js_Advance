"use client";

import { useState } from "react";
import { Icon } from "sns-shared-ui/src/components/Icon";
import { PhotoDndUploader } from "sns-shared-ui/src/components/PhotoDndUploader";
import { Typography } from "sns-shared-ui/src/components/Typography";
import { MAX_UPLOAD_PHOTO_SIZE, MAX_UPLOAD_PHOTO_WIDTH } from "@/constants";
import { uploadPhoto } from "@/lib/s3";
import type { GetCategoriesResponse } from "@/services/getCategories";
import { PhotoMeta } from "./PhotoMeta";
import { postPhotoAction } from "./actions";
import styles from "./style.module.css";

/**
 * Props（PhotoCreateForm が受け取る入力）
 *
 * categories:
 * - 投稿時に選択可能なカテゴリー一覧。
 * - UI（<select> 等）で「カテゴリID」を選ばせるために使う。
 *
 * close:
 * - 投稿モーダルを閉じるためのコールバック。
 * - 投稿完了後（成功/失敗問わず）に close() している点は挙動として要確認だが、
 *   “投稿フローを終了させる” という責務を担う。
 */
type Props = {
  categories: GetCategoriesResponse["categories"];
  close: () => void;
};

/**
 * State（フォーム入力の状態）
 *
 * title:
 * - 投稿写真のタイトル
 *
 * categoryId:
 * - 選択されたカテゴリーID（DB上の主キー相当）
 *
 * description:
 * - 投稿写真の説明文
 *
 * アルゴリズム的には、この State は “投稿メタデータ” の最小表現であり、
 * 最終的に Server Action（postPhotoAction）へ渡す入力となる。
 */
type State = {
  title: string;
  categoryId: string;
  description: string;
};

/**
 * PhotoUploader（ドラッグ&ドロップで写真を受け取る UI）
 *
 * 役割：
 * - ユーザーが画像ファイル（Blob）をアップロード入力できるようにする
 * - 画像サイズ制約（最大容量/最大ピクセル幅）を UI 層で先にかける
 * - ファイルが選択されたら onChange(file) で親へ通知する
 *
 * ここは “入力UI” に専念しており、アップロード（S3へ送る）責務は持たない。
 *
 * アルゴリズム的な見方（ファイル入力→検証→親へ伝搬）：
 * 1. DnD / クリックでファイルを選択
 * 2. PhotoDndUploader がサイズ制約に基づき受理/拒否
 * 3. 受理された Blob を onChange で親へ渡す
 * 4. 親が “アップロードすべきバイナリ” として保持する
 */
function PhotoUploader({ onChange }: { onChange: (file: Blob) => void }) {
  return (
    <PhotoDndUploader
      /**
       * CSS Modules で見た目を制御
       * - photo: 画像領域
       * - area: ドロップ領域
       * - dragActive: ドラッグ中の視覚状態
       */
      className={styles.photo}
      areaClassName={styles.area}
      dragActiveClassName={styles.dragActive}
      /**
       * アップロード制約
       *
       * maxUploadFileSize:
       * - ファイルサイズ（容量）の上限
       *
       * maxUploadRectSize:
       * - 画像の縦横サイズ（ピクセル幅など）の上限
       *
       * これを UI 層で弾くことで、
       * - 失敗が早い（ユーザーがすぐ気づける）
       * - ネットワーク無駄が減る
       * - サーバの負荷も減る
       */
      maxUploadFileSize={MAX_UPLOAD_PHOTO_SIZE}
      maxUploadRectSize={MAX_UPLOAD_PHOTO_WIDTH}
      /**
       * ファイル選択が確定したときに呼ばれる
       * - 親コンポーネントへ Blob を渡す
       */
      onChange={onChange}
    >
      {/**
       * render props パターン
       *
       * isDragActive:
       * - ユーザーがドラッグ中かどうかの状態
       * - アイコン色などの UI を状態に応じて変えるために使う
       */}
      {(isDragActive) => (
        <>
          <Icon
            type="upload"
            size="large"
            /**
             * ドラッグ中は “操作できている感” を出すために色を変える（UX）
             */
            color={isDragActive ? "orange" : "gray"}
          />
          <Typography>
            ここに写真をドロップするか
            <br />
            クリックしてファイルを選択
          </Typography>
        </>
      )}
    </PhotoDndUploader>
  );
}

/**
 * PhotoCreateForm（写真投稿フォーム）
 *
 * 目的：
 * - 画像ファイル（Blob）＋メタデータ（title/categoryId/description）を受け取り、
 *   “投稿” を完結させる。
 *
 * このフォームの特徴：
 * - "use client" の Client Component である
 *   → 画像選択・DnD・アップロードなどブラウザAPIが必要な処理があるため。
 *
 * - form の `action` に async 関数（handleSubmit）を渡している
 *   → “送信イベント onSubmit” ではなく、action 属性向けの関数に寄せた構成。
 *
 * アルゴリズム（投稿パイプライン）：
 * 1. ユーザーが Blob（画像）を選ぶ
 * 2. ユーザーが メタ情報（title/category/description）を入力する
 * 3. 送信（form action）で handleSubmit が呼ばれる
 * 4. 画像を S3 等へ uploadPhoto でアップロードし、imageUrl を得る
 * 5. imageUrl とメタ情報を Server Action（postPhotoAction）へ渡して永続化する
 * 6. 完了後モーダルを閉じる（close）
 */
export function PhotoCreateForm({ categories, close }: Props) {
  /**
   * 【1】投稿情報（メタデータ）を入力するための state
   *
   * useState<State> でフォーム入力状態をまとめて保持する。
   * - title/categoryId/description は “投稿の論理データ” であり、
   *   後で Server Action に渡される。
   *
   * destructuring で state を取り出し、更新用関数 setState で全体更新する設計。
   */
  const [{ title, categoryId, description }, setState] = useState<State>({
    title: "",
    categoryId: "",
    description: "",
  });

  /**
   * handleChangeMeta（メタデータ入力の更新）
   *
   * - 子コンポーネント PhotoMeta から “最新の入力値” を受け取って state を上書きする。
   *
   * アルゴリズム的には：
   * - 子（入力UI）→ 親（単一の真実の状態）への同期。
   */
  const handleChangeMeta = (state: State) => {
    setState(state);
  };

  /**
   * photoData（アップロード対象の画像データ Blob）
   *
   * - PhotoUploader から渡された Blob を保持する。
   * - ここで保持しているのは “まだURL化されていないバイナリ”。
   * - この Blob を uploadPhoto に渡して、S3 などへアップロードする。
   */
  const [photoData, setPhotoData] = useState<Blob>();

  /**
   * handleChangeFile（画像ファイルの更新）
   *
   * - PhotoUploader が受理した Blob を state に保存する。
   */
  const handleChangeFile = (file: Blob) => {
    setPhotoData(file);
  };

  /**
   * handleSubmit（フォーム送信の実体）
   *
   * ここが “投稿アルゴリズムの本体” であり、2段階の副作用を持つ：
   * - (A) 画像アップロード：Blob → imageUrl
   * - (B) 投稿保存：imageUrl + メタ情報 → DB等へ永続化
   *
   * 【2】★:イベントハンドラ onSubmit ではなく action 向けの関数
   * - form の action に渡すことで、submit 時にこの関数が呼ばれる。
   *
   * ※ Server Action を “呼ぶ側” はクライアントでもよいが、
   *   実際の永続化はサーバ側に寄せるのが基本（認証/検証/DB保護）。
   */
  const handleSubmit = async () => {
    /**
     * 画像が無い場合は投稿できないので早期return
     *
     * - “必須入力のガード”。
     * - 実運用なら title/categoryId などもここでチェックすると UX が上がる。
     */
    if (!photoData) return;

    try {
      /**
       * 【3】アップロードした「写真 URL」を取得（A）
       *
       * uploadPhoto:
       * - 画像バイナリ（Blob）を S3（または互換ストレージ）へ送って
       *   公開/参照用の URL（imageUrl）を返す関数を想定。
       *
       * アルゴリズム的には：
       * - “バイナリデータ” を “参照可能なURL” へ変換するステップ。
       * - DB には Blob を直接入れず、URL を保存する設計が一般的。
       */
      const imageUrl = await uploadPhoto({ photoData });

      /**
       * 【4】Server Action を呼び出して投稿を保存（B）
       *
       * postPhotoAction:
       * - imageUrl とメタ情報を受け取り、サーバ側で永続化する（想定）。
       *
       * ★ router.refresh / router.push を削除している理由（文脈から推測される設計）：
       * - Server Action 側で revalidateTag / revalidatePath 等を行い、
       *   “投稿一覧の最新化” をサーバ側の責務として完結させている。
       *
       * アルゴリズム的には：
       * - “URL + メタ情報” を “永続化された投稿レコード” へ変換するステップ。
       */
      await postPhotoAction({ imageUrl, title, categoryId, description });
    } catch (err) {
      /**
       * 失敗時の通知
       *
       * - 現状は alert を出している。
       * - 実運用では、フォーム内エラー表示（state）に寄せるとUXが安定する。
       */
      window.alert("写真のアップロードに失敗しました");
    }

    /**
     * 投稿フローの終了
     *
     * - 成功/失敗に関わらず close() している。
     * - “失敗したら閉じない” 方が再試行できて良い場合もあるので、
     *   ここは要件に応じて分岐してもよい。
     */
    close();
  };

  return (
    /**
     * <form action={handleSubmit}>
     *
     * - submit により handleSubmit が呼ばれる。
     * - 子コンポーネントで Blob とメタ情報を集め、
     *   handleSubmit がそれらを “アップロード→保存” の順に処理する。
     *
     * 注意：
     * - この form 内に submit ボタンが存在する前提（別コンポーネントにある可能性が高い）。
     * - 無い場合は submit が発火しないので、UI側の構成とセットで成立する。
     */
    <form className={styles.form} action={handleSubmit}>
      {/**
       * 画像入力（Blob）
       * - onChange で Blob を受け取り、photoData に保存する。
       */}
      <PhotoUploader onChange={handleChangeFile} />

      {/**
       * メタ情報入力（title/categoryId/description）
       * - categories を渡して選択肢を構築させる。
       * - onChange で “最新の State” を受け取って setState する。
       */}
      <PhotoMeta categories={categories} onChange={handleChangeMeta} />
    </form>
  );
}