import './ScreenContainer.css';

interface ScreenContainerProps {
  children: React.ReactNode;
}

export function ScreenContainer({ children }: ScreenContainerProps) {
  return (
    <div className="container">
      {children}
    </div>
  );
}
