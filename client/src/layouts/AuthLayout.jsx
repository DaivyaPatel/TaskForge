export const AuthLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      {/* Left 40% - Hidden on mobile, animated depth-rail */}
      <div className="hidden lg:block lg:w-[40%] depth-rail-bg relative overflow-hidden">
        <div className="depth-rail-grid border-t border-slate-700/50 shadow-2xl"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
        <div className="absolute bottom-12 left-12 z-20 text-white">
          <h1 className="text-4xl font-bold mb-2">TaskForge</h1>
          <p className="text-slate-400">Master your productivity, securely.</p>
        </div>
      </div>

      {/* Right 60% - Form Content */}
      <div className="w-full lg:w-[60%] flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
};