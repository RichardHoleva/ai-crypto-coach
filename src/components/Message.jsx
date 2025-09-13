function Message({ sender, text }) {
  const isUser = sender === 'user';

  return (
    <div
      className={`p-2 rounded-lg ${
        isUser ? 'bg-blue-200  text-right' : 'bg-gray-200'
      }`}
    >
      {text}
    </div>
  );
}

export default Message;
