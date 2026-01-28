import { CardContainer } from "sns-shared-ui/src/components/CardContainer";
import { HeadGroup } from "sns-shared-ui/src/components/HeadGroup";
import { Heading } from "sns-shared-ui/src/components/Heading";
import { PhotoCard } from "sns-shared-ui/src/components/PhotoCard";
import { Section } from "sns-shared-ui/src/components/Section";
import { PhotoViewModalContainer } from "@/app/_components/PhotoViewModalContainer";
import { getCategory } from "@/services/getCategory";
import { getPhotos } from "@/services/getPhotos";
import styles from "./style.module.css";

/**
 * Props（Dynamic Route の params）
 *
 * - App Router の Dynamic Segment（例：`app/categories/[categoryName]/page.tsx`）では、
 *   URL の `[categoryName]` 部分が `params.categoryName` として渡される。
 *
 * 例：
 * - /categories/flower  → params.categoryName === "flower"
 * - /categories/animal  → params.categoryName === "animal"
 *
 * アルゴリズム的には：
 * - URL のパスに埋め込まれた変数（categoryName）を抽出して関数引数に渡し、
 *   ページが「ルートの状態（URL）」を入力として画面を生成できるようにしている。
 */
type Props = {
  params: { categoryName: string };
};

/**
 * Page（カテゴリ詳細：カテゴリに属する写真一覧ページ）
 *
 * - `"use client"` が無いので Server Component として動作する。
 * - `async` にすることで、サーバ側でデータ取得してから HTML を生成できる。
 *
 * このページの役割：
 * - URL で指定されたカテゴリ（categoryName）を取得し、
 * - 全写真一覧を取得し、
 * - その中から対象カテゴリの写真だけを抽出して表示する。
 *
 * アルゴリズム的な見方（入力→取得→抽出→UI変換）：
 * 1. 入力：params.categoryName（URL由来）
 * 2. getCategory でカテゴリ情報を取得する
 * 3. getPhotos で写真一覧を取得する
 * 4. photos を filter して “カテゴリに属する写真だけ” を抽出する
 * 5. 抽出した配列を map して UI（カード + モーダル）に変換する
 *
 * 注意（性能/設計面の補足）：
 * - 現状は “全写真を取得してから filter” しているため、写真件数が増えると重くなる。
 * - 実運用では「カテゴリIDを条件にした API（/api/photos?categoryId=...）」や
 *   ページネーション（limit/offset）を使って必要分だけ取る設計に寄せるのが一般的。
 */
export default async function Page({ params }: Props) {
  /**
   * カテゴリ取得
   *
   * - getCategory は { categoryName } を引数に取り、
   *   対応するカテゴリを返すサービス関数。
   * - 戻り値が `{ category }` になっているため、
   *   category オブジェクトを取り出して使う。
   *
   * アルゴリズム的には：
   * - “URLで指定された識別子（name）” をキーにしてカテゴリ情報を解決する処理。
   */
  const { category } = await getCategory({ categoryName: params.categoryName });

  /**
   * 写真一覧の取得
   *
   * - getPhotos は写真一覧を返すサービス関数。
   * - ここでは引数に `{}` を渡しているため、
   *   “条件なしで全件取得” のモードを想定している。
   *
   * 戻り値が `{ photos }` の形なので、photos 配列を取り出して使う。
   */
  const { photos } = await getPhotos({});

  /**
   * categoryPhotos（カテゴリに属する写真だけを抽出）
   *
   * - photos 配列から `photo.categoryId === category.id` のものだけを残す。
   * - つまり「全写真」→「対象カテゴリの写真」への絞り込み。
   *
   * アルゴリズム的には：
   * - filter による集合操作（選別）であり、
   *   条件一致する要素だけを取り出す “射影の前段” を作っている。
   *
   * 計算量の観点：
   * - photos の件数を P とすると、この filter は O(P) で走る。
   * - データが増えるとこの処理がボトルネックになり得る（API 側で絞るのが望ましい）。
   */
  const categoryPhotos = photos.filter(
    (photo) => photo.categoryId === category.id,
  );

  return (
    /**
     * styles.page（ページ全体のラッパー）
     *
     * - CSS Modules により、このページ専用のスタイルを適用する。
     * - 余白や背景など “ページ全体の見た目” を制御する想定。
     */
    <div className={styles.page}>
      {/**
       * Section（セクション枠）
       *
       * - UI ライブラリ側が余白/幅/見た目を揃えてくれる前提で使っている。
       */}
      <Section>
        {/**
         * HeadGroup + Heading（見出し）
         *
         * - カテゴリ名（category.label）をページの主見出しとして表示する。
         * - label はユーザー向け表示名（例：「花」）であることが多い。
         */}
        <HeadGroup>
          <Heading level={1} size="medium">
            {category.label}
          </Heading>
        </HeadGroup>

        {/**
         * 条件付き描画：カテゴリに写真がある場合のみカード一覧を表示する
         *
         * - categoryPhotos が 0 件なら CardContainer 自体を描画しない。
         * - 0 件のときに「まだ投稿がありません」等の空状態UIを出す設計も一般的。
         */}
        {categoryPhotos.length > 0 && (
          /**
           * CardContainer（カードを並べるコンテナ）
           *
           * - grid/flex 等の配置をここに閉じ込めて、
           *   ページ側は “カードを列挙する” ことに集中できる。
           */
          <CardContainer>
            {/**
             * 写真配列 → UI への変換（map）
             *
             * - categoryPhotos の各要素を PhotoCard に変換する。
             * - さらに PhotoViewModalContainer で包むことで
             *   “クリックするとモーダルで詳細表示” のような機能を付与する。
             *
             * アルゴリズム：
             * 1. photo を取り出す
             * 2. photo.id を key にしてリスト差分更新を安定させる
             * 3. PhotoViewModalContainer に photo を渡し、モーダル表示のコンテキストを作る
             * 4. 子要素として PhotoCard を渡して見た目を描画する
             *
             * この “container + children” パターンにより、
             * - 表示（カード）と挙動（モーダル）を分離しやすい。
             */
            {categoryPhotos.map((photo) => (
              <PhotoViewModalContainer key={photo.id} photo={photo}>
                {/**
                 * PhotoCard（写真カード）
                 *
                 * - `{...photo}` で photo のプロパティをまとめて渡す。
                 * - PhotoCard 側が photo の形に沿って props を定義している想定。
                 */}
                <PhotoCard {...photo} />
              </PhotoViewModalContainer>
            ))}
          </CardContainer>
        )}
      </Section>
    </div>
  );
}