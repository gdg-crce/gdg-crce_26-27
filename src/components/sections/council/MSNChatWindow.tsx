'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CouncilMember } from './councilData';

interface MSNChatWindowProps {
  currentMember: CouncilMember;
  onNext?: () => void;
  onPrev?: () => void;
  onClose?: () => void;
  onToggleMinimize?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'system' | 'member' | 'user';
  text: string;
  time: string;
  chips?: string[];
  quickActions?: { label: string; action: string }[];
  socialLinks?: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    email?: string;
  };
}

export default function MSNChatWindow({
  currentMember,
  onNext,
  onPrev,
  onClose,
  onToggleMinimize,
}: MSNChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isNudging, setIsNudging] = useState(false);
  const [showSecurityBanner, setShowSecurityBanner] = useState(true);
  const historyEndRef = useRef<HTMLDivElement>(null);

  const getFormattedTime = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Initialize conversation thread when currentMember changes
  useEffect(() => {
    const time = getFormattedTime();
    const initialThread: ChatMessage[] = [
      {
        id: `sys-${currentMember.id}-${Date.now()}`,
        sender: 'system',
        text: `*** ${currentMember.name} has joined the conversation. ***`,
        time,
      },
      {
        id: `m1-${currentMember.id}`,
        sender: 'member',
        text: `Hey there! 👋 Welcome to GDG CRCE. I'm ${currentMember.name}, ${currentMember.role}.`,
        time,
      },
      {
        id: `m2-${currentMember.id}`,
        sender: 'member',
        text: `${currentMember.bio}`,
        time,
      },
      {
        id: `m3-${currentMember.id}`,
        sender: 'member',
        text: `My core technical stack & focus areas include:`,
        time,
        chips: currentMember.techStack,
      },
      {
        id: `m4-${currentMember.id}`,
        sender: 'member',
        text: `💡 System Status Quote: "${currentMember.quote}"`,
        time,
      },
      {
        id: `m5-${currentMember.id}`,
        sender: 'member',
        text: `How can I help or connect with you today? Choose an option below or type a message!`,
        time,
        quickActions: [
          { label: '🎯 Tell me about your track', action: 'track_info' },
          { label: '🔗 Show Social Links & Connect', action: 'social_links' },
          { label: '💡 What is GDG CRCE?', action: 'about_gdg' },
        ],
      },
    ];

    setMessages(initialThread);
  }, [currentMember]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isNudging]);

  const triggerShake = () => {
    setIsNudging(true);
    setTimeout(() => {
      setIsNudging(false);
    }, 650);
  };

  const handleNudge = () => {
    triggerShake();
    const time = getFormattedTime();
    setMessages((prev) => [
      ...prev,
      {
        id: `nudge-sys-${Date.now()}`,
        sender: 'system',
        text: `*** You sent a Nudge! ***`,
        time,
      },
    ]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `nudge-resp-${Date.now()}`,
          sender: 'member',
          text: `Whoa! Received your nudge 📳 I'm right here! Feel free to ask me about ${currentMember.trackTitle} or connect on socials!`,
          time: getFormattedTime(),
        },
      ]);
    }, 700);
  };

  const handleQuickAction = (action: string, label: string) => {
    const time = getFormattedTime();
    setMessages((prev) => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text: label,
        time,
      },
    ]);

    setTimeout(() => {
      const respTime = getFormattedTime();
      if (action === 'track_info') {
        setMessages((prev) => [
          ...prev,
          {
            id: `resp-track-${Date.now()}`,
            sender: 'member',
            text: `My primary domain is "${currentMember.trackTitle}"! We actively organize hands-on technical bootcamps, code reviews, and high-velocity engineering projects for ${currentMember.team}.`,
            time: respTime,
          },
        ]);
      } else if (action === 'social_links') {
        setMessages((prev) => [
          ...prev,
          {
            id: `resp-soc-${Date.now()}`,
            sender: 'member',
            text: `You can connect with me directly through these platforms below:`,
            time: respTime,
            socialLinks: currentMember.socials,
          },
        ]);
      } else if (action === 'about_gdg') {
        setMessages((prev) => [
          ...prev,
          {
            id: `resp-gdg-${Date.now()}`,
            sender: 'member',
            text: `Google Developer Group (GDG) on Campus CRCE is our premier engineering & leadership community where students collaborate, build world-class products, and scale real-world skills!`,
            time: respTime,
          },
        ]);
      }
    }, 500);
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    const time = getFormattedTime();
    setInputText('');

    setMessages((prev) => [
      ...prev,
      {
        id: `usr-txt-${Date.now()}`,
        sender: 'user',
        text: userMsg,
        time,
      },
    ]);

    // Simulated intelligent response
    setTimeout(() => {
      const respTime = getFormattedTime();
      let replyText = `Thanks for reaching out! I'm currently working on "${currentMember.trackTitle}". Feel free to connect with me on GitHub or LinkedIn!`;

      const lower = userMsg.toLowerCase();
      if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        replyText = `Hey there! Great to chat with you. Have you checked out the other teams in our contact list?`;
      } else if (lower.includes('contact') || lower.includes('link') || lower.includes('social')) {
        setMessages((prev) => [
          ...prev,
          {
            id: `resp-dyn-soc-${Date.now()}`,
            sender: 'member',
            text: `Here are my direct profiles so we can stay in touch:`,
            time: respTime,
            socialLinks: currentMember.socials,
          },
        ]);
        return;
      } else if (lower.includes('tech') || lower.includes('stack') || lower.includes('code')) {
        replyText = `I specialize in: ${currentMember.techStack.join(', ')}. We are always looking for passionate builders at CRCE!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `resp-dyn-${Date.now()}`,
          sender: 'member',
          text: replyText,
          time: respTime,
        },
      ]);
    }, 600);
  };

  return (
    <div className={`msn-chat-window ${isNudging ? 'is-nudging' : ''}`}>
      {/* Authentic MSN Instant Message Titlebar */}
      <div className="msn-titlebar">
        <div className="msn-titlebar-left">
          <span className="msn-butterfly-icon" title="Instant Message">🦋</span>
          <span className="msn-title-text">
            {currentMember.name} - Instant Message
          </span>
        </div>
        <div className="msn-titlebar-buttons">
          <button
            type="button"
            className="xp-btn-win xp-btn-min"
            onClick={onToggleMinimize}
            title="Minimize"
          >
            _
          </button>
          <button type="button" className="xp-btn-win xp-btn-max" title="Maximize">
            □
          </button>
          <button
            type="button"
            className="xp-btn-win xp-btn-close"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Classic Chat Menu Bar */}
      <div className="msn-menubar">
        <span><u>F</u>ile</span>
        <span><u>E</u>dit</span>
        <span><u>V</u>iew</span>
        <span><u>A</u>ctions</span>
        <span><u>T</u>ools</span>
        <span><u>H</u>elp</span>
      </div>

      {/* Recipient Header Box */}
      <div className="msn-recipient-bar">
        <span className="msn-recipient-to">To: </span>
        <span className="msn-recipient-name">
          {currentMember.name} &lt;{currentMember.role.toLowerCase().replace(/[^a-z]/g, '')}@gdgcrce.edu&gt;
        </span>
      </div>

      {/* Authentic Yellow Security Warning Banner */}
      {showSecurityBanner && (
        <div className="msn-security-banner">
          <div className="msn-security-text">
            <span className="msn-security-icon">⚠️</span>
            <span>
              Never give out your password or credit card number in an instant message
              conversation.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSecurityBanner(false)}
            className="msn-security-close"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Split Body */}
      <div className="msn-chat-body">
        {/* Left Side: Conversation Pane & Input Box */}
        <div className="msn-chat-left-pane">
          {/* Conversation History Pane */}
          <div className="msn-chat-history">
            {messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="msn-msg-system">
                    {msg.text}
                  </div>
                );
              }

              const isUser = msg.sender === 'user';
              const senderLabel = isUser ? 'You say:' : `${currentMember.name} says:`;
              const senderColorClass = isUser ? 'msn-sender-user' : 'msn-sender-member';

              return (
                <div key={msg.id} className="msn-msg-item">
                  <div className="msn-msg-header">
                    <span className={senderColorClass}>{senderLabel}</span>
                    <span className="msn-msg-time">({msg.time})</span>
                  </div>
                  <div className="msn-msg-content">
                    <p className="msn-msg-text">{msg.text}</p>

                    {/* Tech Stack Chips */}
                    {msg.chips && msg.chips.length > 0 && (
                      <div className="msn-msg-chips">
                        {msg.chips.map((chip, i) => (
                          <span key={i} className="msn-chip">
                            ⚙️ {chip}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quick Actions Prompts */}
                    {msg.quickActions && (
                      <div className="msn-quick-actions">
                        {msg.quickActions.map((qa, i) => (
                          <button
                            key={i}
                            type="button"
                            className="msn-quick-action-btn"
                            onClick={() => handleQuickAction(qa.action, qa.label)}
                          >
                            {qa.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Clickable Social Links */}
                    {msg.socialLinks && (
                      <div className="msn-social-links-box">
                        {msg.socialLinks.github && (
                          <a
                            href={msg.socialLinks.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="msn-social-link"
                          >
                            💻 GitHub Profile ↗
                          </a>
                        )}
                        {msg.socialLinks.linkedin && (
                          <a
                            href={msg.socialLinks.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="msn-social-link"
                          >
                            🔗 LinkedIn Profile ↗
                          </a>
                        )}
                        {msg.socialLinks.instagram && (
                          <a
                            href={msg.socialLinks.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="msn-social-link"
                          >
                            📸 Instagram Profile ↗
                          </a>
                        )}
                        {msg.socialLinks.email && (
                          <a
                            href={`mailto:${msg.socialLinks.email}`}
                            className="msn-social-link"
                          >
                            ✉️ Send Email ↗
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={historyEndRef} />
          </div>

          {/* Chat Formatting Toolbar & Nudge */}
          <div className="msn-chat-formatting-bar">
            <div className="msn-format-left">
              <button type="button" className="msn-format-btn" title="Font">
                <b>A</b>
              </button>
              <button type="button" className="msn-format-btn" title="Color">
                🎨
              </button>
              <button type="button" className="msn-format-btn" title="Emoticons">
                😊
              </button>
              <button type="button" className="msn-format-btn" title="Wink">
                😉
              </button>
              <button type="button" className="msn-format-btn" title="Voice Clip">
                🎙️
              </button>
            </div>
            <button
              type="button"
              className="msn-nudge-btn"
              onClick={handleNudge}
              title="Send a Nudge to shake the chat window!"
            >
              <span>📳</span>
              <span>Send a Nudge</span>
            </button>
          </div>

          {/* Message Textarea Input & Send Button */}
          <form onSubmit={handleSendText} className="msn-chat-input-row">
            <textarea
              className="msn-chat-textarea"
              placeholder={`Type a message to ${currentMember.name}... (Enter to send)`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
            />
            <div className="msn-chat-send-actions">
              <button type="submit" className="msn-send-btn">
                <span>Send</span>
              </button>
              <button
                type="button"
                className="msn-search-history-btn"
                onClick={() => setMessages([])}
                title="Clear Conversation"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Dual Display Pictures Sidebar (`DPs`) */}
        <div className="msn-chat-right-pane">
          {/* Top DP: Council Member */}
          <div className="msn-dp-section">
            <div className="msn-dp-title">{currentMember.name}&apos;s DP</div>
            <div
              className="msn-dp-box-large"
              style={{ background: currentMember.avatarBg }}
            >
              <span className="msn-dp-large-glyph">{currentMember.avatarIcon}</span>
              <div className="msn-dp-status-badge online" title="Online" />
            </div>
            <div className="msn-dp-caption">
              <strong>{currentMember.role}</strong>
              <span>{currentMember.trackTitle}</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="msn-dp-nav-row">
            <button
              type="button"
              className="msn-dp-nav-btn"
              onClick={onPrev}
              title="Previous Member"
            >
              ◀ Prev
            </button>
            <span className="msn-dp-nav-counter">
              Track {currentMember.id}/14
            </span>
            <button
              type="button"
              className="msn-dp-nav-btn"
              onClick={onNext}
              title="Next Member"
            >
              Next ▶
            </button>
          </div>

          {/* Bottom DP: Visitor / You */}
          <div className="msn-dp-section bottom">
            <div className="msn-dp-title">Your Display Picture</div>
            <div
              className="msn-dp-box-large visitor"
              style={{
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
              }}
            >
              <span className="msn-dp-large-glyph">⚡</span>
              <div className="msn-dp-status-badge online" title="Online" />
            </div>
            <div className="msn-dp-caption">
              <strong>You (Visitor)</strong>
              <span>GDG CRCE Explorer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
