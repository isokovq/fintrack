import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Send, Sparkles, RefreshCw } from 'lucide-react';

export default function AIPage() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Hi! I'm your FinTrack AI assistant 👋 I can help you analyze your spending, give financial advice, and answer questions about your finances. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const { data: insights = [], refetch: refetchInsights, isFetching: insightsFetching } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => api.get('/ai/insights').then(r => r.data),
    staleTime: 300000
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-8).map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content
      }));

      const res = await api.post('/ai/chat', { message: userMsg, history });
      setMessages(m => [...m, { role: 'ai', content: res.data.response }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'ai', content: "Sorry, I'm having trouble connecting. Please try again." }]);
    }
    setLoading(false);
  };

  const quickPrompts = [
    "How can I reduce my expenses?",
    "What's my spending pattern?",
    "How much should I save?",
    "Which category am I overspending on?"
  ];

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✨</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>AI Financial Assistant</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Powered by Claude — your personal finance advisor</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Chat */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={15} color="var(--purple)" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Chat with AI</span>
          </div>

          <div className="chat-messages" style={{ padding: 16 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                {msg.role === 'ai' && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={10} /> FinTrack AI
                  </div>
                )}
                <div className="chat-bubble" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-message ai">
                <div className="chat-bubble" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ animation: 'pulse 1s infinite' }}>●</span>
                  <span style={{ animation: 'pulse 1s 0.2s infinite' }}>●</span>
                  <span style={{ animation: 'pulse 1s 0.4s infinite' }}>●</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length === 1 && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {quickPrompts.map((p, i) => (
                <button key={i} className="btn btn-ghost btn-sm" onClick={() => { setInput(p); }} style={{ fontSize: 12 }}>{p}</button>
              ))}
            </div>
          )}

          <div className="chat-input-area">
            <input
              className="form-control"
              placeholder="Ask about your finances..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            />
            <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()} style={{ flexShrink: 0 }}>
              <Send size={14} />
            </button>
          </div>
        </div>

        {/* Insights */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>📊 AI Spending Insights</h3>
            <button className="btn-icon" onClick={() => refetchInsights()} disabled={insightsFetching} title="Refresh insights">
              <RefreshCw size={13} style={{ animation: insightsFetching ? 'spin 0.8s linear infinite' : 'none' }} />
            </button>
          </div>

          {insightsFetching ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              <div className="loader" style={{ margin: '0 auto 12px', width: 28, height: 28 }} />
              <div>Analyzing your finances...</div>
            </div>
          ) : insights.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {insights.map((insight, i) => (
                <div key={i} className={`alert alert-${insight.type === 'warning' ? 'warning' : insight.type === 'info' ? 'info' : 'success'}`} style={{ marginBottom: 0, animation: `fadeIn 0.3s ${i * 0.1}s both` }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{insight.emoji} {insight.title}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, opacity: 0.9 }}>{insight.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <p>Add more transactions for AI to analyze your spending patterns</p>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => refetchInsights()}>Generate Insights</button>
            </div>
          )}

          <div style={{ marginTop: 20, padding: '12px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            💡 <strong>Tip:</strong> Insights are generated based on your transaction history. The more you track, the smarter the advice!
          </div>
        </div>
      </div>
    </div>
  );
}
