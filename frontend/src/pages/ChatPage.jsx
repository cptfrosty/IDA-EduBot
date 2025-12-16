import React from 'react';
import ChatWindow from '../components/chat/ChatWindow';
import { useParams } from 'react-router-dom';

const ChatPage = () => {

  const { chatId } = useParams();

  return (
    <div className="page-container">
      <ChatWindow chatId={chatId} />
    </div>
  );
};

export default ChatPage;