import { HeadGroup } from "sns-shared-ui/src/components/HeadGroup";
import { Heading } from "sns-shared-ui/src/components/Heading";
import { Pagination } from "sns-shared-ui/src/components/Pagination";
import { PhotoCard } from "sns-shared-ui/src/components/PhotoCard";
import { Section } from "sns-shared-ui/src/components/Section";
import { PhotoViewModalContainer } from "@/app/_components/PhotoViewModalContainer";
import type { Photo } from "@/services/type";
import styles from "./style.module.css";
import type { PaginationProps } from "sns-shared-ui/src/components/Pagination";

/**
 * Props（TopPhotos が受け取る入力データ）
 *
 * photos:
 * - 表示する写真一覧（最新投稿など）
 *
 * pagination:
 * - ページネーションUIを描画するためのメタ情報（総ページ数、次/前の有無などを想定）
 * - sns-shared-ui 側の Pagination コンポーネントが要求する形（PaginationProps）に合わせる
 *
 * page:
 * - 現在のページ番号
 * - URLクエリ（?page=...）由来で string になりやすいので、ここでは string として受け取っている
 *
 * アルゴリズム的には：
 * - “一覧表示に必要な状態（items + paging state）” を 1 つの入力として束ねたもの。
 */
type Props = {
  photos: Photo[];
  pagination: PaginationProps;
  page: string;
};

/**
 * TopPhotos（トップページの「最新投稿」一覧セクション）
 *
 * 役割：
 * - 最新投稿の写真カード一覧を表示する
 * - 写真カードクリックでモーダル表示（詳細ビュー）できるようにする
 * - 一覧下部にページネーションUIを表示する
 *
 * アルゴリズム的な見方（データ → UI変換パイプライン）：
 * 1. 見出し（最新投稿）を描画する
 * 2. photos 配列を map し、PhotoCard の列へ変換する
 * 3. 各 PhotoCard を PhotoViewModalContainer で包み、クリック時の詳細表示（モーダル）を付与する
 * 4. 現在ページ（page）と pagination 情報から Pagination UI を組み立てる
 *
 * このコンポーネントは「表示とUI変換」に専念しており、
 * データ取得（fetch/DB）は外側（Page/Server Component）で済ませた状態を受け取る設計になっている。
 */
export function TopPhotos({ photos, pagination, page }: Props) {
  return (
    <>
      {/**
       * Section（UIの区切り）
       *
       * - 共有UIコンポーネントで “セクションの余白やレイアウト” を統一する。
       */}
      <Section>
        {/**
         * HeadGroup + Heading（セクション見出し）
         *
         * - HeadGroup は見出し周りのレイアウト（揃え/余白）を提供する想定。
         * - Heading は見出し階層（level）とサイズ（size）を指定できる。
         */}
        <HeadGroup>
          <Heading level={1} size="medium">
            最新投稿
          </Heading>
        </HeadGroup>

        {/**
         * styles.cardContainer（カードの並びを制御するコンテナ）
         *
         * - CSS Modules により、このページ（またはこのコンポーネント）専用のカードレイアウトを管理する。
         * - グリッド/フレックスでカードを整列させる用途を想定。
         */}
        <div className={styles.cardContainer}>
          {/**
           * 写真カード一覧の描画
           *
           * - photos 配列を走査し、各要素を UI に変換する典型的な処理。
           * - key には photo.id を使い、React が差分更新を安定して行えるようにしている。
           *
           * アルゴリズム的には：
           * - “配列（写真データ）→ UIノード列（カード）” への写像（map）処理。
           */}
          {photos.map((photo) => (
            /**
             * PhotoViewModalContainer（モーダル表示の付与）
             *
             * - 子要素（PhotoCard）をラップし、「クリックしたら写真詳細をモーダル表示する」などの
             *   振る舞い（状態管理/UI制御）をここに閉じ込める役割を持つ想定。
             *
             * 重要な点：
             * - “表示専用の PhotoCard” と “インタラクション（モーダル）” を分離している。
             *
             * アルゴリズム的には：
             * - “カード表示” に “追加の振る舞い（詳細表示）” をデコレーションしている構造。
             */
            <PhotoViewModalContainer key={photo.id} photo={photo}>
              {/**
               * PhotoCard（写真カードの表示）
               *
               * - `{...photo}` としているため、Photo 型のフィールドをそのまま props として渡す。
               * - 共有UIとして表示責務を PhotoCard に寄せ、ここでは一覧変換だけを担う。
               */}
              <PhotoCard {...photo} />
            </PhotoViewModalContainer>
          ))}
        </div>
      </Section>

      {/**
       * Pagination（ページネーションUI）
       *
       * currentPage:
       * - `page` は string なので、`+page` で number に変換して渡している（単項 + による数値化）。
       *
       * pagination:
       * - 総ページ数や next/prev の有無等を含む想定のメタ情報。
       *
       * pathname:
       * - ページリンクを生成する基準パス。
       * - トップページの一覧なので "/" を指定している。
       *
       * アルゴリズム的には：
       * - “現在ページ + ページング情報 + 基準パス” から
       *   “遷移先URLの列（前へ/次へ/ページ番号リンク）” を生成し描画する工程。
       *
       * 注意（堅牢性）：
       * - `+page` は page が "abc" のような不正値だと NaN になり得る。
       *   実運用では page の正規化（数値変換 + 範囲チェック）を上流で行うことが多い。
       */}
      <Pagination currentPage={+page} pagination={pagination} pathname="/" />
    </>
  );
}