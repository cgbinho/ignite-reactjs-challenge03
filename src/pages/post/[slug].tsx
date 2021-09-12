import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';
import Header from '../../components/Header';

import commonStyles from '../../styles/common.module.scss';
import postStyles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  // fallback if static page is yet to be generated
  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  const firstPublicationDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  const readTimeFormatted = (() => {
    const readTime = post.data.content.reduce((sum, content) => {
      const contentText = RichText.asText(content.body).split(' ');
      const contentTextLength = contentText.length;
      // console.log(contentTextLength / 200);
      const contentTextTime = Math.ceil(contentTextLength / 200);
      return sum + contentTextTime;
    }, 0);

    return `${readTime} min`;
  })();

  return (
    <div className={commonStyles.container}>
      <Header />
      <figure>
        <img src={post.data.banner.url} alt="" />
      </figure>
      <main className={commonStyles.content}>
        <h1>{post.data.title}</h1>
        <div className={postStyles.postcard_metadata}>
          <FiCalendar size={20} />
          <small>{firstPublicationDate}</small>
          <FiUser size={20} />
          <small>{post.data.author}</small>
          <FiClock size={20} />
          <small>{readTimeFormatted}</small>
        </div>
        <main className={postStyles.post_content}>
          {post.data.content.map(contentItem => (
            <section key={contentItem.heading}>
              <h2>{contentItem.heading}</h2>
              <article
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(contentItem.body),
                }}
              />
            </section>
          ))}
        </main>
      </main>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts'),
  ]);

  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  // To Do: add reading time to each result:
  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      title: response.data.title,
      subtitle: response.data.subtitle,
      content: response.data.content.map(contentItem => {
        return {
          heading: contentItem.heading,
          body: [...contentItem.body],
        };
      }),
    },
  };

  return {
    props: { post },
    revalidate: 60 * 60 * 24,
  };
};
