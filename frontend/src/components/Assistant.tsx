import { useRef, useState } from 'react'
import { api } from '../api'
import type { AssistantResponse } from '../types'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export default function Assistant({
  completed,
  trackId,
}: {
  completed: string[]
  trackId: string
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hi — I'm the DegreePilot academic assistant. I work from your actual degree data (courses, requirements, and your completed courses), not from a language model. Ask me about your degree requirements, a career-track pathway, recommended electives, or a semester plan.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggested, setSuggested] = useState<string[]>([
    'What are my degree requirements?',
    'How close am I to graduating?',
    'What is the best pathway for software engineering?',
    'Recommend technical electives for data science',
    'Generate my semester plan for the next 3 semesters',
  ])
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = async (text: string) => {
    const msg = text.trim()
    if (!msg || loading) return
    setMessages((m) => [...m, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)
    try {
      const res: AssistantResponse = await api.askAssistant(msg, completed, trackId)
      setMessages((m) => [...m, { role: 'assistant', text: res.answer }])
      if (res.suggested_questions?.length) setSuggested(res.suggested_questions)
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: `Sorry — the assistant request failed: ${String(e)}` },
      ])
    } finally {
      setLoading(false)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div>
      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="chat-role">{m.role === 'user' ? 'You' : 'DegreePilot'}</div>
            <div className="chat-text">{m.text}</div>
          </div>
        ))}
        {loading && <div className="chat-msg assistant">Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <div className="chips">
        {suggested.map((q) => (
          <button key={q} className="chip" onClick={() => send(q)}>
            {q}
          </button>
        ))}
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Ask about requirements, pathways, electives, or a semester plan…"
        />
        <button onClick={() => send(input)} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
      <p className="muted">
        Deterministic engine: answers are generated from the structured degree
        data. No API key or language model is involved.
      </p>
    </div>
  )
}
