import Link from "next/link";
import { notFound } from "next/navigation";
import { Heading } from "sns-shared-ui/src/components/Heading";
import { Typography } from "sns-shared-ui/src/components/Typography";
import { ModalOverlay } from "@/app/(site)/@modal/_components/ModalOverlay";
import { PhotoViewNavigator } from "@/app/_components/PhotoViewNavigator";
import { getServerSession } from "@/lib/auth";
import { getPhoto } from "@/services/getPhoto";
import { getPhotoLike } from "@/services/getPhotoLike";
import { LikeButtonForm } from "./LikeButtonForm";
import styles from "./style.module.css";

/**
 * Props（このページが受け取る入力）
 *
 * params.photoId:
 * - App Router の Dynamic Segment（例：app/.../[photoId]/page.tsx）から渡される値。
 * - URL の一部（/photos/<photoId> など）を “ページの入力” として受け取れる。
 *
 * アルゴリズム的には：
 * - “URL → 変数（photoId）への変換” により、ページが「どの写真を表示するか」を一意に決定する。
 */
type Props = {
  params: { photoId: string };
};

/**
 * Page（モーダル表示用の写真詳細ページ）
 *
 * 想定される配置：
 * - Parallel Routes / Intercepting Routes により @modal スロットに差し込まれるページ。
 * - 背景ページ（children）を保ちつつ、モーダルの UI をこのページが担当する。
 *
 * 役割：
 * - photoId を元に写真情報を取得し、モーダルとして表示する
 * - セッションがある場合のみ「いいね済みか否か」を追加で取得し、LikeButtonForm に渡す
 * - A11y（role/dialog + aria-*）を整備する
 * - キーボード操作（次/前の写真移動など）のための PhotoViewNavigator を配置する
 *
 * アルゴリズム的な見方（入力→取得→分岐→描画）：
 * 1. URL から photoId を受け取る（params.photoId）
 * 2. photo と session を並列に取得する（Promise.all）
 * 3. photo が存在しない場合は 404（notFound）
 * 4. ログイン済みなら liked を取得、未ログインなら liked=false
 * 5. モーダル UI を描画（Overlay + Navigator + Dialog）
 */
// 【1】Dynamic Segment の [photoId] を参照する
export default async function Page({ params }: Props) {
  /**
   * モーダル用の ID を生成（ここでは固定文字列）
   *
   * - aria-labelledby / aria-describedby で参照するための id を作っている。
   * - 本来は useId を使うのが自然だが、このページは Server Component のため useId は使えない。
   *
   * 注意：
   * - 固定文字列だと “同時に複数モーダルが存在する” 状況で衝突する可能性がある。
   * - ただし現実的に1つしか出さない前提なら問題になりにくい。
   * - より安全にするなら `modalId = `modal-${params.photoId}` のように photoId を含める設計が考えられる。
   *
   * アルゴリズム的には：
   * - “DOM内参照のためのキー” を組み立てる工程。
   */
  const modalId = "modalId";
  const titleId = modalId + "-title";
  const descriptionId = modalId + "-description";

  /**
   * 【2】Server Component としてデータ取得する（並列取得）
   *
   * Promise.all により、以下を同時に実行する：
   * - getPhoto({ id: params.photoId })：写真データの取得
   * - getServerSession()：ログイン状態（セッション）の取得
   *
   * これにより、直列で
   * - まず photo を取って
   * - 次に session を取る
   * よりも待ち時間を短縮できる可能性がある。
   *
   * 返ってくる配列を分割代入している：
   * - [{ photo }, session] という形で、1つ目は { photo }、2つ目は session。
   *
   * アルゴリズム的には：
   * - “独立な I/O（photo取得とsession取得）” を並列化して、総待ち時間を削減している。
   */
  const [{ photo }, session] = await Promise.all([
    getPhoto({ id: params.photoId }),
    getServerSession(),
  ]);

  /**
   * photo が取得できなかった場合は 404
   *
   * - notFound() は Next.js の “このページは存在しない” を表す制御。
   * - Intercepting Routes のモーダルでも同様に 404 扱いにできる。
   *
   * アルゴリズム的には：
   * - “入力（photoId）に対するデータが無い” 場合のエラー分岐（ガード）。
   */
  if (!photo) {
    notFound();
  }

  /**
   * 【3】ログインユーザーの場合、いいね済みかどうかを取得する
   *
   * - session?.user.id が存在するならログイン済みとみなし、
   *   getPhotoLike を呼んで liked を取得する。
   * - 未ログインなら liked=false をデフォルトとして扱う。
   *
   * ここを常に getPhotoLike しない理由：
   * - 未ログインの場合、userId が無いので問い合わせが成立しない
   * - 余計な API/DB 問い合わせを避けられる
   *
   * アルゴリズム的には：
   * - “認証状態（userIdの有無）” を条件に、追加情報（liked）を取得する分岐。
   */
  const { liked } = session?.user.id
    ? await getPhotoLike({ userId: session.user.id, photoId: photo.id })
    : { liked: false };

  return (
    /**
     * styles.modal（モーダル全体の外枠）
     *
     * - overlay と dialog をまとめるラッパー。
     * - z-index / fixed / center などは CSS Modules 側で管理する想定。
     */
    <div className={styles.modal}>
      {/**
       * ModalOverlay（背景の暗幕）
       *
       * - 典型的には “背景を暗くする” と同時に “クリックで閉じる” 挙動を持つ。
       * - ここでは close ハンドラは渡していないので、
       *   ModalOverlay 側が router.back() 等で閉じる実装を内包している可能性がある。
       *
       * アルゴリズム的には：
       * - “モーダルレイヤを視覚的に際立たせる” ための UI レイヤ。
       */}
      <ModalOverlay />

      {/**
       * 【4】キーボード操作のためのコンポーネント
       *
       * PhotoViewNavigator:
       * - photoId を受け取り、左右キーで次/前の写真へ移動するなどの制御を担う想定。
       *
       * なぜここに置くか：
       * - モーダルが表示されている間だけ “キーボード操作” を有効化したい。
       * - ルートレベルの Provider（PhotoIdsContextProvider）と連携して、
       *   “次に進む写真ID” を決定できるようにする。
       *
       * アルゴリズム的には：
       * - “現在の photoId” を起点に、Context の ID 列から “次/前” を解決し、ルーティング/表示を更新する。
       */}
      <PhotoViewNavigator photoId={photo.id} />

      {/**
       * dialog（モーダル本体）
       *
       * role="dialog" / aria-modal="true":
       * - 支援技術に「ダイアログである」ことを伝える。
       *
       * aria-labelledby / aria-describedby:
       * - ダイアログのタイトル（Heading）と説明（Typography）を関連付ける。
       *
       * アルゴリズム的には：
       * - “可視 UI” だけでなく “意味（タイトル/説明）” も機械可読にしている。
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
         * - backgroundImage に photo.imageUrl を設定して表示している。
         * - <img> より cover などの制御が CSS でしやすい。
         *
         * LikeButtonForm:
         * - photo と liked を渡し、
         *   “いいねの送信（フォーム）” と “表示（disabled等）” を担当する想定。
         *
         * アルゴリズム的には：
         * - “写真データ” と “ユーザー状態（liked）” を合成し、操作可能な UI を構築している。
         */}
        <div
          className={styles.photo}
          style={{ backgroundImage: `url(${photo.imageUrl})` }}
        >
          <LikeButtonForm photo={photo} liked={liked} />
        </div>

        {/**
         * footer（テキスト情報の表示領域）
         *
         * - titleId / descriptionId の参照先をここに置くことで、
         *   aria-labelledby / aria-describedby の整合を取っている。
         */}
        <footer className={styles.footer}>
          {/**
           * Heading（タイトル）
           *
           * - id={titleId} が aria-labelledby の参照先になる。
           *
           * Link（詳細ページへ）:
           * - /photos/:photoId の “フルページ版” に遷移する導線。
           * - prefetch を true にすることで、Next.js が可能なら事前取得を行い、
           *   遷移を体感的に速くする狙いがある。
           *
           * ★ コメントの意図：
           * - “モーダル内にもリンクを置く” ことで、
           *   ユーザーがクリックし得る導線が増え、prefetch の機会が増える。
           * - ただし Next.js の prefetch は条件（表示範囲・ネットワーク等）に依存する。
           *
           * アルゴリズム的には：
           * - “将来の遷移先” を先読みして、遷移コストを前倒しする最適化。
           */}
          <Heading level={2} id={titleId} className={styles.title}>
            {/* ★: Link を増やすことで prefetch を促す */}
            <Link href={`/photos/${params.photoId}`} prefetch>
              {photo.title}
            </Link>
          </Heading>

          {/**
           * Typography（説明文）
           *
           * - id={descriptionId} が aria-describedby の参照先になる。
           * - photo.description を表示する。
           */}
          <Typography id={descriptionId} className={styles.description}>
            {photo.description}
          </Typography>
        </footer>
      </div>
    </div>
  );
}