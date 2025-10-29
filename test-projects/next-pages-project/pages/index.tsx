import { useState } from 'react'
import Head from 'next/head'

export default function Home() {
  const [errors, setErrors] = useState<string[]>([]);

  const triggerError = () => {
    try {
      throw new Error('测试错误 - Next.js Pages Router');
    } catch (error) {
      setErrors(prev => [...prev, (error as Error).message]);
    }
  };

  const triggerAsyncError = () => {
    Promise.reject(new Error('异步错误测试 - Next.js Pages'));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  return (
    <>
      <Head>
        <title>Next.js Pages Test - dev-inject</title>
        <meta name="description" content="测试 dev-inject 在 Next.js Pages Router 中的注入功能" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-green-500 to-teal-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">📄 Next.js Pages Router Test</h1>
            <p className="text-xl opacity-90">测试 dev-inject 框架感知注入功能</p>
          </header>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">🚀 测试功能</h2>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={triggerError}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
                >
                  触发同步错误
                </button>
                <button
                  onClick={triggerAsyncError}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
                >
                  触发异步错误
                </button>
                <button
                  onClick={clearErrors}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  清除错误
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">📊 错误记录</h2>
              {errors.length === 0 ? (
                <p className="text-gray-300 italic">暂无错误</p>
              ) : (
                <div className="space-y-2">
                  {errors.map((error, index) => (
                    <div key={index} className="bg-red-500/20 border-l-4 border-red-500 p-3 rounded font-mono text-sm">
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
              <h2 className="text-2xl font-semibold mb-4">🔧 DevMonitor 检查</h2>
              <p className="mb-3">在浏览器控制台中检查：</p>
              <ul className="space-y-1 text-left max-w-md mx-auto">
                <li><code className="bg-black/20 px-2 py-1 rounded">DevMonitor.showPanel()</code> - 显示监控面板</li>
                <li><code className="bg-black/20 px-2 py-1 rounded">DevMonitor.getStats()</code> - 获取统计信息</li>
                <li><code className="bg-black/20 px-2 py-1 rounded">window.__DEV_INJECT__</code> - 检查注入状态</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

