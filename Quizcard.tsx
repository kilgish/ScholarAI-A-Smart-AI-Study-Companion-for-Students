import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, ArrowRight, HelpCircle } from 'lucide-react';

interface QuizCardProps {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (isCorrect: boolean) => void;
  onNext: () => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ question, questionIndex, totalQuestions, onAnswer, onNext }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleOptionClick = (index: number) => {
    if (isSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    setIsSubmitted(true);
    onAnswer(selectedOption === question.correctAnswerIndex);
  };

  const isCorrect = selectedOption === question.correctAnswerIndex;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-2xl w-full mx-auto transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">
          Quiz Mode
        </span>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-6 leading-relaxed">
        {question.question}
      </h3>

      <div className="space-y-3 mb-6">
        {question.options.map((option, idx) => {
          let cardClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ";
          
          if (isSubmitted) {
            if (idx === question.correctAnswerIndex) {
              cardClass += "border-green-500 bg-green-50 text-green-900";
            } else if (idx === selectedOption) {
              cardClass += "border-red-500 bg-red-50 text-red-900";
            } else {
              cardClass += "border-slate-100 text-slate-400 opacity-60";
            }
          } else {
            if (selectedOption === idx) {
              cardClass += "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm";
            } else {
              cardClass += "border-slate-100 hover:border-indigo-200 hover:bg-slate-50 text-slate-700";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(idx)}
              className={cardClass}
              disabled={isSubmitted}
            >
              <span className="font-medium">{option}</span>
              {isSubmitted && idx === question.correctAnswerIndex && <CheckCircle className="w-5 h-5 text-green-600" />}
              {isSubmitted && idx === selectedOption && idx !== question.correctAnswerIndex && <XCircle className="w-5 h-5 text-red-600" />}
            </button>
          );
        })}
      </div>

      {isSubmitted && (
        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-800 text-sm mb-1">Explanation</p>
              <p className="text-slate-600 text-sm leading-relaxed">{question.explanation}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={selectedOption === null}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={() => {
                setSelectedOption(null);
                setIsSubmitted(false);
                onNext();
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Next Question <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizCard;
