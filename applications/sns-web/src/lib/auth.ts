import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerSession as originalGetServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";

/**
 * authOptions（NextAuth の設定本体）
 *
 * - NextAuth は「認証プロバイダ」「セッションの管理方法」「DB 永続化（Adapter）」
 *   「トークン/セッションの加工（callbacks）」などを authOptions に集約して定義する。
 *
 * アルゴリズム的な見方（ログイン→トークン生成→セッション生成）：
 * 1. ユーザーが Google でログインする
 * 2. NextAuth が user 情報を受け取り、JWT callback を呼ぶ（トークンを生成/更新）
 * 3. session callback で、JWT の内容を session.user に投影して返す
 * 4. アプリ側は getServerSession などで session を取得し、認証済みユーザー情報として扱う
 */
export const authOptions: NextAuthOptions = {
    /**
     * adapter（永続化アダプター）
     *
     * - PrismaAdapter を使うことで NextAuth のユーザー/セッション等を Prisma 経由でDBへ保存できる。
     * - `PrismaAdapter(prisma)` が本来の形。
     *
     * `as any` が入っている理由（推測される背景）：
     * - PrismaAdapter と prisma の型の整合がプロジェクトの prisma 定義や NextAuth バージョン差で
     *   うまく合わないケースがある。
     * - eslint-disable-line により lint 警告を抑えている。
     *
     * 注意：
     * - 型をごまかすと、将来の破壊的変更や設定ミスがコンパイルで検出できない。
     * - 可能なら prisma の型を正して `as any` を消す方が健全。
     */
    adapter: PrismaAdapter(prisma as any), // eslint-disable-line

    /**
     * session（セッション方式）
     *
     * strategy: "jwt" の意味：
     * - セッション情報を DB セッションではなく JWT に載せて管理する方針。
     *
     * アルゴリズム的には：
     * - “セッション状態をサーバ側に保持する” のではなく、
     * - “署名付きトークン（JWT）に状態を封入してやり取りする”
     * という方式を取る。
     *
     * メリット：
     * - DB 参照が少なくなりやすい（設計次第）
     * - スケールしやすい
     *
     * デメリット（一般論）：
     * - JWT のサイズが肥大化すると通信コストが増える
     * - 失効・強制ログアウトの扱いが DB セッションより難しくなる場合がある
     */
    session: {
        strategy: "jwt",
    },

    /**
     * providers（認証プロバイダ）
     *
     * - GoogleProvider を 1 つ追加し、Google OAuth でログインできるようにする。
     * - clientId / clientSecret は環境変数から読み込む。
     *
     * 注意：
     * - `|| ""` は「未設定でも型的に string を満たす」ための逃げだが、
     *   未設定のまま起動すると認証が動かないので、本来は起動時に例外にして気づける設計もあり得る。
     */
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_ID || "",
            clientSecret: process.env.GOOGLE_SECRET || "",
        }),
    ],

    /**
     * callbacks（トークン/セッションの加工フック）
     *
     * NextAuth のコールバックは
     * - “OAuth で得た user 情報”
     * - “アプリ内の DB の user 情報”
     * を結びつけ、アプリにとって使いやすい形に整形する場所。
     *
     * このコードでは主に：
     * - jwt: token に user.id を確実に載せる / DB の user 情報で token を上書きする
     * - session: token の内容を session.user にコピーする
     * をやっている。
     */
    callbacks: {
        /**
         * jwt callback（JWT の生成/更新）
         *
         * 引数：
         * - token: 既存の JWT ペイロード（NextAuth が管理する “トークンの箱”）
         * - user: 初回ログイン直後などに渡される user 情報（状況により undefined）
         *
         * アルゴリズム的な見方（メールで DB ユーザーを解決 → トークンを正規化）：
         * 1. token.email をキーに DB を検索して “DB 上のユーザー” を探す
         * 2. 見つからなければ（初回など） user.id を token.id に入れて返す
         * 3. 見つかれば DB のユーザー情報で token を作り直して返す
         *
         * ここでの狙い：
         * - 以後の session callback で「token.id をユーザーID」として使えるようにすること。
         */
        async jwt({ token, user }) {
            /**
             * DB からユーザーを取得
             *
             * - where: { email: token.email } で email をキーに検索。
             *
             * 注意：
             * - `findFirst` を使っているが、email は schema 上 @unique なら findUnique が自然。
             * - token.email は OAuth の状況次第で null/undefined の可能性があるため、
             *   実運用では型ガード（token.email が string か確認）を入れることが多い。
             */
            const dbUser = await prisma.user.findFirst({
                where: { email: token.email },
            });

            /**
             * DB ユーザーが見つからないケース
             *
             * - 初回ログイン直後や、何らかの理由で DB と紐づいていない場合に起き得る。
             * - この場合、user が渡っていれば user.id を token.id に入れて返す。
             *
             * アルゴリズム的には：
             * - “DB 解決に失敗したので、OAuth から来た user 情報を暫定採用する”
             *   というフォールバック。
             */
            if (!dbUser) {
                if (user) {
                    token.id = user?.id;
                }
                return token;
            }

            /**
             * DB ユーザーが見つかったケース
             *
             * - DB を正として、JWT に載せる情報を DB 値で統一する。
             * - token を丸ごと差し替える形で返している。
             *
             * ここで返している形：
             * - id / name / email / picture（image）
             *
             * アルゴリズム的には：
             * - “トークンの正規化（canonicalization）” をしている。
             *   以後の処理では token のフィールドが揃っている前提で扱える。
             */
            return {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                picture: dbUser.image,
            };
        },

        /**
         * session callback（session の生成/更新）
         *
         * 引数：
         * - session: NextAuth が返すセッションオブジェクト（クライアント/サーバで利用）
         * - token: jwt callback で整形されたトークン
         *
         * アルゴリズム的な見方（token → session.user への投影）：
         * 1. session.user が存在するか確認
         * 2. token の値を session.user の各フィールドへコピー
         * 3. 更新済み session を返す
         *
         * 目的：
         * - アプリ側が `session.user.id` を使えるようにする（NextAuth のデフォルト型には id が無いことが多い）。
         */
        async session({ session, token }) {
            if (session.user) {
                /**
                 * session.user へのコピー
                 *
                 * - token.id を string として扱うために `as string` している。
                 * - name/email/image も token 側の値で上書きする。
                 *
                 * 注意：
                 * - token.name/token.email/token.picture が undefined の可能性もあるので、
                 *   厳密にやるなら型ガードやデフォルト値を検討する。
                 */
                session.user.id = token.id as string;
                session.user.name = token.name;
                session.user.email = token.email;
                session.user.image = token.picture;
            }
            return session;
        },
    },
};

/**
 * getServerSession（サーバ側でセッションを取得するラッパー）
 *
 * - NextAuth の `getServerSession(authOptions)` を呼ぶ関数。
 * - App Router の Server Component / Route Handler 側で
 *   “現在のリクエストに紐づくセッション” を取得する用途で使う。
 *
 * ここにコメントで ❌ が付いている意図：
 * - この関数は同一レンダリング内で複数回呼ばれる可能性がある。
 * - その場合、React.cache で包んでいないと毎回セッション取得処理が走り得る。
 * - したがって “同一リクエスト内での重複実行を抑える” なら、
 *   `cache(() => originalGetServerSession(authOptions))` のようにメモ化する設計が候補になる。
 *
 * アルゴリズム的には：
 * - “認証状態（session）を取得する処理” は入力（リクエスト）に対して
 *   同じ結果を返すことが多いので、メモ化に向く性質を持つ。
 */
export const getServerSession = async () => {
    // ❌: React.cache で囲んでいない
    return originalGetServerSession(authOptions);
};