import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState('light')
  const [sortType, setSortType] = useState('name')

  const NEIS_API_KEY = 'ffacd7ca6a1d41c1abd51edadd2cd273'

  const examples = ['서울', '한빛', '대진', '중앙', '과학']

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const normalizeUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `https://${url}`
  }

  const getSchoolTypeClass = (type) => {
    if (!type) return 'type-neutral'
    if (type.includes('초등')) return 'type-elementary'
    if (type.includes('중')) return 'type-middle'
    if (type.includes('고')) return 'type-high'
    if (type.includes('특수')) return 'type-special'
    return 'type-neutral'
  }

  const getSchoolIcon = (type) => {
    if (!type) return '🏫'
    if (type.includes('초등')) return '🧒'
    if (type.includes('중')) return '📘'
    if (type.includes('고')) return '🎓'
    if (type.includes('특수')) return '✨'
    return '🏫'
  }

  const searchSchool = async (customKeyword) => {
    const finalKeyword = (customKeyword ?? keyword).trim()

    if (!finalKeyword) {
      alert('학교명을 입력하세요.')
      return
    }

    setKeyword(finalKeyword)
    setLoading(true)
    setError('')
    setSearched(true)
    setResults([])

    try {
      const response = await axios.get('https://open.neis.go.kr/hub/schoolInfo', {
        params: {
          KEY: NEIS_API_KEY,
          Type: 'json',
          pIndex: 1,
          pSize: 30,
          SCHUL_NM: finalKeyword,
        },
      })

      const schoolInfo = response.data.schoolInfo

      if (schoolInfo && schoolInfo[1] && schoolInfo[1].row) {
        setResults(schoolInfo[1].row)
      } else {
        setResults([])
      }
    } catch (err) {
      console.error(err)
      setError('학교 정보를 불러오지 못했습니다. 인증키 또는 CORS 문제일 수 있습니다.')
    } finally {
      setLoading(false)
    }
  }

  const sortedResults = useMemo(() => {
    const copied = [...results]

    if (sortType === 'name') {
      copied.sort((a, b) => (a.SCHUL_NM || '').localeCompare(b.SCHUL_NM || '', 'ko'))
    } else if (sortType === 'type') {
      copied.sort((a, b) => (a.SCHUL_KND_SC_NM || '').localeCompare(b.SCHUL_KND_SC_NM || '', 'ko'))
    } else if (sortType === 'office') {
      copied.sort((a, b) => (a.ATPT_OFCDC_SC_CODE || '').localeCompare(b.ATPT_OFCDC_SC_CODE || '', 'ko'))
    }

    return copied
  }, [results, sortType])

  const totalCountText = useMemo(() => {
    if (loading) return '검색 중...'
    if (!searched) return '아직 검색 전'
    return `총 ${results.length}건`
  }, [loading, searched, results.length])

  return (
    <div className="app-shell">
      <div className="bg-gradient bg-gradient-1"></div>
      <div className="bg-gradient bg-gradient-2"></div>

      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">🏫</div>
          <div>
            <div className="brand-title">School Search</div>
            <div className="brand-subtitle">NEIS 학교기본정보 검색</div>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? '🌙 다크모드' : '☀️ 라이트모드'}
          </button>
        </div>
      </header>

      <main className="page-container">
        <section className="hero-card">
          <div className="hero-text">
            <div className="hero-chip">NEIS Open API</div>
            <h1>학교 정보 검색</h1>
            <p>
              초·중·고 학교명을 입력하면 기본 정보와 홈페이지를 빠르게 조회할 수 있습니다.
            </p>
          </div>

          <div className="search-box">
            <div className="search-row">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchSchool()}
                placeholder="예: 서울, 한빛, 대진, 중앙"
                className="search-input"
              />
              <button
                onClick={() => searchSchool()}
                disabled={loading}
                className="search-button"
              >
                {loading ? '검색 중...' : '검색'}
              </button>
            </div>

            <div className="example-row">
              {examples.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="example-chip"
                  onClick={() => searchSchool(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="summary-grid">
          <article className="summary-card">
            <span className="summary-label">검색 상태</span>
            <strong>{loading ? '불러오는 중' : '준비 완료'}</strong>
          </article>
          <article className="summary-card">
            <span className="summary-label">결과 수</span>
            <strong>{totalCountText}</strong>
          </article>
          <article className="summary-card">
            <span className="summary-label">데이터 소스</span>
            <strong>NEIS schoolInfo</strong>
          </article>
        </section>

        <section className="section-head">
          <div>
            <h2>검색 결과</h2>
            <p>학교명 일부만 입력해도 검색되는 경우가 많습니다.</p>
          </div>

          <div className="control-row">
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value)}
              className="sort-select"
            >
              <option value="name">이름순</option>
              <option value="type">학교급순</option>
              <option value="office">교육청코드순</option>
            </select>
          </div>
        </section>

        {error && (
          <section className="state-card error-card">
            <div className="state-icon">⚠️</div>
            <div>
              <h3>오류가 발생했습니다</h3>
              <p>{error}</p>
            </div>
          </section>
        )}

        {loading ? (
          <section className="result-grid">
            {Array.from({ length: 6 }).map((_, idx) => (
              <article key={idx} className="school-card skeleton-card">
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-badge"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="skeleton skeleton-line short"></div>
              </article>
            ))}
          </section>
        ) : sortedResults.length > 0 ? (
          <section className="result-grid">
            {sortedResults.map((school, index) => (
              <article
                key={`${school.SD_SCHUL_CODE || 'school'}-${index}`}
                className="school-card"
              >
                <div className="card-head">
                  <div className="card-title-wrap">
                    <div className="title-row">
                      <span className="school-emoji">{getSchoolIcon(school.SCHUL_KND_SC_NM)}</span>
                      <h3>{school.SCHUL_NM}</h3>
                    </div>
                    <span className={`school-type-badge ${getSchoolTypeClass(school.SCHUL_KND_SC_NM)}`}>
                      {school.SCHUL_KND_SC_NM || '학교'}
                    </span>
                  </div>
                  <span className="office-chip">
                    {school.ATPT_OFCDC_SC_CODE || '교육청코드 없음'}
                  </span>
                </div>

                <div className="info-group">
                  <div className="info-block">
                    <span className="info-label">주소</span>
                    <span className="info-value">{school.ORG_RDNMA || '-'}</span>
                  </div>

                  <div className="info-block two-col">
                    <div>
                      <span className="info-label">전화번호</span>
                      <span className="info-value">{school.ORG_TELNO || '-'}</span>
                    </div>
                    <div>
                      <span className="info-label">학교 코드</span>
                      <span className="info-value">{school.SD_SCHUL_CODE || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  {school.HMPG_ADRES ? (
                    <a
                      href={normalizeUrl(school.HMPG_ADRES)}
                      target="_blank"
                      rel="noreferrer"
                      className="site-link"
                    >
                      홈페이지 방문
                    </a>
                  ) : (
                    <span className="site-link disabled">홈페이지 정보 없음</span>
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="state-card empty-card">
            <div className="state-icon">🔎</div>
            <div>
              <h3>{searched ? '검색 결과가 없습니다' : '아직 검색한 결과가 없습니다'}</h3>
              <p>
                {searched
                  ? '다른 학교명이나 짧은 키워드로 다시 검색해보세요.'
                  : '위 검색창에서 학교명을 입력하고 검색해보세요.'}
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <p>© 2026 박성록. All rights reserved.</p>
          <p>본 사이트는 NEIS Open API 기반으로 제작되었습니다.</p>
        </div>
      </footer>
    </div>
  )
}

export default App
