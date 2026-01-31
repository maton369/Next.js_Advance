import { notFound } from "next/navigation";
import { SITE_NAME } from "@/constants";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoryById } from "@/services/getCategoryById";
import { getPhoto } from "@/services/getPhoto";
import { getPhotoLike } from "@/services/getPhotoLike";
import { PhotoComment } from "./_components/PhotoComment";
import { PhotoHero } from "./_components/PhotoHero";
import { PhotoMeta } from "./_components/PhotoMeta";
import styles from "./style.module.css";
import type { Metadata } from "next";

/**
 * Props（Dynamic Route の params 型）
 *
 * - App Router の Dynamic Segment（例：app/photos/[photoId]/page.tsx）では、
 *   URL のパスの一部（[photoId]）が `params.photoId` として渡される。
 *
 * 例：
 * - /photos/abc123 にアクセス → params.photoId === "abc123"
 *
 * アルゴリズム的には：
 * - 「URL のパス」→「キー付き入力（params）」へデコードされ、
 *   ページ関数の引数として渡される。
 */
type Props = {
  params: { photoId: string };
};

/**
 * generateMetadata（動的メタデータ生成）
 *
 * - このページは写真詳細であり、title/description を “写真ごと” に変えたい。
 * - そのため params.photoId を使って写真データを取得し、メタデータを組み立てる。
 *
 * アルゴリズム的な見方（photoId → photo 解決 → メタデータ構築）：
 * 1. params.photoId を受け取る
 * 2. getPhoto(photoId) で写真を取得する
 * 3. 取得できなければ notFound()（存在しない投稿は 404）
 * 4. 取得できたら photo.title / photo.description を使って Metadata を返す
 *
 * 注意：
 * - ここで getPhoto を呼ぶため、ページ本体でも getPhoto を呼ぶと
 *   同一リクエスト内で二重取得になり得る。
 * - その場合はサービス関数側の fetch キャッシュ/メモ化設計で吸収するのが一般的。
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  /**
   * 写真データの取得
   *
   * - getPhoto は「photoId → photo」を解決するサービス関数（API/DBのどちらか）を想定。
   * - 戻り値が { photo } 形になっているため分割代入している。
   */
  const { photo } = await getPhoto(params.photoId);

  /**
   * 写真が存在しない場合は 404
   *
   * - 動的ルートで /photos/<id> に来たが、その id のデータが無いケース。
   * - notFound() を呼ぶことで Next.js の 404 ルートへ遷移する。
   */
  if (!photo) {
    notFound();
  }

  /**
   * メタデータの構築
   *
   * - title: 「写真タイトル | サイト名」の形式
   * - description: 写真の説明文
   *
   * アルゴリズム的には：
   * - “ドメインデータ（photo）” を “SEO/表示用の要約情報（metadata）” に変換している。
   */
  return {
    title: `${photo.title} | ${SITE_NAME}`,
    description: photo.description,
  };
}

/**
 * Page（写真詳細ページ本体）
 *
 * このページがやっていることをアルゴリズムとして整理すると、次の “分岐と合成” である：
 *
 * 【1】認証状態（session）を取得し、ログインユーザーID（userId）を得る
 * 【2】photoId で photo を一意に解決する（存在しなければ 404）
 * 【3】photo.authorId で投稿者（author）を取得（存在しなければ 404）
 * 【4】photo.categoryId でカテゴリーを取得
 * 【5】ログイン中なら「このユーザーがこの写真をいいね済みか」を取得（未ログインなら false）
 * 【6】ログインユーザーが投稿者本人か（isOwner）を判定
 * 【7】上記の状態を UI コンポーネントへ投影して描画する
 *
 * つまり “photo を中心にして、周辺情報（author/category/like/session）を集めて UI を組み立てる”
 * という依存グラフを持ったページである。
 */
export default async function Page({ params }: Props) {
  /**
   * 【1】ログインしているか否か（セッション取得）
   *
   * - getServerSession は NextAuth のセッション解決関数。
   * - ログインしていなければ session は null になり得る。
   *
   * このページはログイン必須ではない設計になっている（後続で liked 取得を分岐しているため）。
   * ただし “いいね” や “自分の投稿か” の判定には session.user.id が必要になる。
   */
  const session = await getServerSession();

  /**
   * 【2】Dynamic Segment の photoId を参照して、一意の投稿写真を特定
   *
   * - params.photoId により “どの写真詳細か” が決まる。
   * - getPhoto でデータを取得し、無ければ 404。
   *
   * アルゴリズム的には：
   * - “ID による一意解決” がページの基準点（root）であり、
   *   以後の取得は photo を起点に広がる。
   */
  const { photo } = await getPhoto(params.photoId);
  if (!photo) {
    notFound();
  }

  /**
   * 【3】写真の投稿者を特定し、プロフィールを取得
   *
   * - photo.authorId をキーに User を取得する。
   * - select で必要なフィールドだけ取得している（転送量の最小化）。
   * - profile はネスト select で screenName のみ取得し、プロフィール表示/リンクに使えるようにしている。
   *
   * アルゴリズム的には：
   * - “photo → authorId → author” という参照を 1 段辿っている。
   */
  const author = await prisma.user.findUnique({
    where: { id: photo.authorId },
    select: {
      id: true,
      name: true,
      image: true,
      profile: { select: { screenName: true } },
    },
  });
  if (!author) {
    /**
     * 投稿者が存在しないなら 404
     *
     * - 通常は photo.authorId が正しく外部キー整合していれば起きにくいが、
     *   データ欠損や削除済みユーザーなどのケースを安全に処理している。
     */
    notFound();
  }

  /**
   * 【4】カテゴリー情報を取得
   *
   * - photo.categoryId からカテゴリーを取得する。
   * - getCategoryById はサービス層（API 呼び出し/DBアクセス）を隠蔽する関数を想定。
   *
   * アルゴリズム的には：
   * - “photo → categoryId → category” を辿る 1 段の参照解決。
   */
  const { category } = await getCategoryById(photo.categoryId);

  /**
   * 【5】いいね済みか否かを取得
   *
   * - いいねは “ログインユーザー × 写真” の関係なので、userId が無ければ判定できない。
   * - そこで session?.user.id がある場合のみ getPhotoLike を呼び、
   *   未ログインの場合は liked: false として扱う。
   *
   * 実装のポイント：
   * - 三項演算子で “ログイン時だけ I/O する” という分岐を作っている。
   *
   * アルゴリズム的には：
   * - “条件付き参照（optional query）”
   *   userId があるときのみ “like 関係” を解決する。
   */
  const { liked } = session?.user.id
    ? await getPhotoLike({ userId: session.user.id, photoId: photo.id })
    : { liked: false };

  /**
   * 【6】ログインユーザー自身の投稿か否か
   *
   * - isOwner は UI の分岐（編集ボタン表示、削除可否など）に使うためのフラグ。
   * - userId は undefined になり得るので、まず userId を取り出してから比較している。
   *
   * アルゴリズム的には：
   * - “同一性判定（identity check）” により権限フラグを生成する工程。
   */
  const userId = session?.user.id;
  const isOwner = userId === author.id;

  return (
    <>
      {/**
       * PhotoHero（画面上部の大きな写真）
       *
       * - photo: 表示対象の写真
       * - isOwner: 投稿者本人かどうか（UIの権限分岐に使う）
       * - liked: ログインユーザーがいいね済みか（UIの状態に使う）
       *
       * アルゴリズム的には：
       * - “集めた状態（photo + liked + isOwner）” をヒーロー領域に投影する。
       */}
      <PhotoHero photo={photo} isOwner={isOwner} liked={liked} />

      {/**
       * styles.content（レイアウト用コンテナ）
       *
       * - PhotoMeta（左）と PhotoComment（右）を並べるためのスタイルを想定。
       */}
      <div className={styles.content}>
        {/**
         * PhotoMeta（画面下左の投稿概要）
         *
         * - photo: 写真情報（タイトル/説明など）
         * - author: 投稿者情報（name/image/screenName）
         * - category: カテゴリー情報
         * - isOwner: 本人投稿か（編集導線など）
         *
         * アルゴリズム的には：
         * - “photo を中心とした周辺情報（author/category）をまとめて表示” する領域。
         */}
        <PhotoMeta
          photo={photo}
          author={author}
          isOwner={isOwner}
          category={category}
        />

        {/**
         * PhotoComment（画面右下のコメント機能）
         *
         * - photo: コメント取得のキーに使う（photo.id）
         * - userId: ログインユーザーID（コメント投稿などに必要）
         *
         * アルゴリズム的には：
         * - “photoId をキーにコメント情報を構築し、クライアント側UIに渡す” 機能ブロック。
         */}
        <PhotoComment photo={photo} userId={userId} />
      </div>
    </>
  );
}