
import React from 'react';
import MenuItem from './components/MenuItem';
import ShieldIcon from './components/icons/ShieldIcon';
import TrophyIcon from './components/icons/TrophyIcon';
import ChartBarIcon from './components/icons/ChartBarIcon';
import RefreshIcon from './components/icons/RefreshIcon';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-900 via-blue-950 to-gray-900 animate-gradient text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-wider">القائمة الرئيسية</h1>
          <p className="text-gray-400 mt-2">تصميم تجريبي</p>
        </header>

        <main>
          <div className="grid grid-cols-1 gap-6">
            <MenuItem label="الفرق" icon={<ShieldIcon />} />
            <MenuItem label="البطولات" icon={<TrophyIcon />} />
            <MenuItem label="التصنيف" icon={<ChartBarIcon />} />
            <MenuItem label="اعادة التعيين" icon={<RefreshIcon />} />
          </div>
        </main>
        
        <footer className="text-center mt-16 text-gray-500 text-sm">
            <p>نموذج واجهة تطبيق</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
