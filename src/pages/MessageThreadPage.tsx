import { useParams } from 'react-router-dom';
import { MessageThread } from '../features/messaging/components/MessageThread';
import { NotFoundPage } from './NotFoundPage';

export function MessageThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();

  if (!threadId) return <NotFoundPage />;

  return (
    <div className="container">
      <MessageThread threadId={threadId} />
    </div>
  );
}
