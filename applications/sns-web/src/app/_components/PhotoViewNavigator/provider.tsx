import Link from "next/link";
import { HeadGroup } from "sns-shared-ui/src/components/HeadGroup";
import { Heading } from "sns-shared-ui/src/components/Heading";
import { Pagination } from "sns-shared-ui/src/components/Pagination";
import { PhotoCard } from "sns-shared-ui/src/components/PhotoCard";
import { Section } from "sns-shared-ui/src/components/Section";
import { PhotoIdsContainer } from "@/app/_components/PhotoViewNavigator/container";
import { getPhotos } from "@/services/getPhotos";
import styles from "./style.module.css";

/**
 * Props（TopPhotos が受け取る入力）
 *
 * searchParams:
 * - URL のクエリ文字列（例：`/?page=2`）を参照するための値。
 * - Next.js App Router では、ページやコンポーネントに searchParams を渡して
 *   “表示内容を URL で切り替える” 設計をよく行う。
 *
 * 型が `{ [key: string]: string | string[] | undefined }` なのは、
 * - クエリキーは任意（動的）に増え得る
 * - 同じキーが複数回出現する可能性がある（string[]）
 * - 指定されない場合もある（undefined）
 * という Web のクエリ仕様を安全に扱うため。
 */
type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

/**
 * TopPhotos（最新投稿一覧 + ページネーション）
 *
 * 役割：
 * - URL の page クエリを読み取り、該当ページの “最新投稿写真” を取得する
 * - 写真カード一覧（PhotoCard）をリンク付きで表示する
 * - PhotoIdsContainer を使って “現在表示中の写真ID一覧” を共有状態（Context）に流し込む
 * - Pagination を表示して、次ページ/前ページへの遷移を可能にする
 *
 * 重要な性質：
 * - この関数は async であり、Server Component として動作する想定。
 *   つまり getPhotos（fetch/DB）をサーバ側で実行し、HTML を生成できる。
 *
 * アルゴリズム的な見方（URL → データ → 状態共有 → UI合成）：
 * 1. searchParams から page を抽出し、表示対象ページを決定
 * 2. getPhotos({ page }) で該当ページの写真一覧と pagination 情報を取得
 * 3. 取得した photos から photoIds を生成し、PhotoIdsContainer に渡す
 * 4. photos を map して PhotoCard の一覧を生成（各カードは Link で遷移可能）
 * 5. Pagination によりページ遷移 UI を描画する
 */
export async function TopPhotos({ searchParams }: Props) {
  /**
   * page（ページ番号）の抽出と正規化
   *
   * - searchParams.page は string / string[] / undefined になり得る。
   * - ここでは “単一の string” の場合のみ採用し、それ以外は "1" にフォールバックしている。
   *
   * 例：
   * - /?page=3  -> page === "3"
   * - /         -> page === "1"
   * - /?page=1&page=2 -> string[] になり得るので "1"
   *
   * アルゴリズム的には：
   * - “入力の揺れ（型・未指定）” を吸収して、後段の処理が単純に扱える形へ正規化する工程。
   */
  const page = typeof searchParams.page === "string" ? searchParams.page : "1";

  /**
   * 【1】最新投稿写真一覧に使用するデータを取得
   *
   * getPhotos:
   * - サーバ側で API/DB へ問い合わせ、photos と pagination を返す想定。
   *
   * 取得結果：
   * - photos: 表示する写真の配列
   * - pagination: totalPages や hasNext など、Pagination コンポーネントに渡すための情報
   *
   * アルゴリズム的には：
   * - “ページ番号（page）” を入力として “該当ページのデータ集合” を取り出す処理。
   * - 典型的なページネーションのデータ取得の形になっている。
   */
  const { photos, pagination } = await getPhotos({ page });

  return (
    <>
      {/**
       * Section / HeadGroup / Heading（セクション見出し）
       *
       * - UI を「最新投稿」セクションとしてまとまりを持たせる。
       */}
      <Section>
        <HeadGroup>
          <Heading level={1} size="medium">
            最新投稿
          </Heading>
        </HeadGroup>

        {/**
         * styles.cardContainer（カード一覧のレイアウト）
         *
         * - グリッド/フレックスでカードを並べる想定。
         */}
        <div className={styles.cardContainer}>
          {/**
           * PhotoIdsContainer（写真ID一覧を Context に流し込むコンテナ）
           *
           * 役割：
           * - photos から取り出した ID の並びを受け取り、
           *   PhotoIdsContext（useRef）へ “現在の一覧順” を書き込む。
           *
           * なぜ必要か：
           * - モーダル表示中に PhotoViewNavigator が “次/前” を決めるには、
           *   背景一覧が持つ「表示順のID列」を共有する必要がある。
           *
           * ここで渡している photoIds:
           * - photos.map((photo) => photo.id)
           * - “このページで表示している写真カードの順序” をそのまま ID 列にしたもの。
           *
           * アルゴリズム的には：
           * - “UIに表示される順序” を “ナビゲーション用の順序付き集合” に変換して共有する工程。
           */}
          <PhotoIdsContainer photoIds={photos.map((photo) => photo.id)}>
            {/**
             * 写真カード一覧の生成
             *
             * - photos を map して、カード表示（PhotoCard）へ変換する。
             * - 各カードは Next.js の Link でラップし、クリックで詳細（モーダル）へ遷移可能にする。
             *
             * アルゴリズム的には：
             * - “データ配列（photos）” を “UI要素列（Link + PhotoCard）” に写像する処理。
             */}
            {photos.map((photo) => (
              <Link
                key={photo.id}
                /**
                 * href={`/photos/${photo.id}/view`}
                 *
                 * - ここは “view” という経路で、モーダル表示（@modal スロットに割り込み）を狙っている想定。
                 * - Intercepting Routes の構成次第で、背景ページを保ったままモーダルが出る。
                 *
                 * アルゴリズム的には：
                 * - “写真ID” をパスに埋め込み、1枚の写真を指すURLを生成する。
                 */
                href={`/photos/${photo.id}/view`}
                /**
                 * prefetch={true}
                 *
                 * - Next.js が可能ならリンク先を事前取得し、遷移を体感的に速くする。
                 * - 特にモーダルのように “クリック即表示” を期待する導線では効きやすい。
                 *
                 * 注意：
                 * - prefetch の実際の挙動は環境やルート構成に依存するため、常に期待通りとは限らない。
                 */
                prefetch={true}
              >
                {/**
                 * PhotoCard
                 *
                 * - 写真のサムネイル、タイトル、いいね数などを表示する共通カード UI。
                 * - {...photo} で Photo 型のプロパティ一式を渡している。
                 */}
                <PhotoCard {...photo} />
              </Link>
            ))}
          </PhotoIdsContainer>
        </div>
      </Section>

      {/**
       * Pagination（ページネーション UI）
       *
       * currentPage={+page}:
       * - page は string なので、+page で number に変換している。
       * - 例："3" -> 3
       *
       * pagination={pagination}:
       * - getPhotos が返したページ情報をそのまま渡す。
       *
       * pathname="/":
       * - ページリンク生成のベースとなるパス。
       * - 例：/?page=2 のような URL を組み立てる想定。
       *
       * prefetch={true}:
       * - ページ遷移先も事前取得し、ページングの体感速度を上げる狙い。
       *
       * アルゴリズム的には：
       * - “現在ページ” と “総ページ/次前情報” から、遷移先URL群を生成して表示する処理。
       */}
      <Pagination
        currentPage={+page}
        pagination={pagination}
        pathname="/"
        prefetch={true}
      />
    </>
  );
}