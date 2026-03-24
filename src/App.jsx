import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import './App.css'

// 시도 교육청 코드 매핑
const OFFICE_CODES = {
  '': '전체 지역',
  B10: '서울',
  C10: '부산',
  D10: '대구',
  E10: '인천',
  F10: '광주',
  G10: '대전',
  H10: '울산',
  I10: '세종',
  J10: '경기',
  K10: '강원',
  M10: '충북',
  N10: '충남',
  P10: '전북',
  Q10: '전남',
  R10: '경북',
  S10: '경남',
  T10: '제주',
}

const SCHOOL_TYPES = {
  '': '전체 학교급',
  '초등학교': '초등학교',
  '중학교': '중학교',
  '고등학교': '고등학교',
  '특수학교': '특수학교',
}

function App() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState('light')
  const [sortType, setSortType] = useState('name')
  const [regionFilter, setRegionFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [copied, setCopied] = useState(false)

  const NEIS_API_KEY = import.meta.env.VITE_NEIS_API_KEY || 'ffacd7ca6a1d41c1abd51edadd2cd273'

  const examples = ['서울', '한빛', '대진', '중앙', '과학']
  const topRef = useRef(null)

  // URL 파라미터에서 초기 검색어 불러오기
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    const region = params.get('region')
    const type = params.get('type')
    if (q) {
      setKeyword(q)
      if (region) setRegionFilter(region)
      if (type) setTypeFilter(type)
      searchSchool(q, region || '', type || '')
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  const searchSchool = async (customKeyword, customRegion, customType) => {
    const finalKeyword = (customKeyword ?? keyword).trim()
    const finalRegion = customRegion !== undefined ? customRegion : regionFilter
    const finalType = customType !== undefined ? customType : typeFilter

    if (!finalKeyword) {
      alert('학교명을 입력하세요.')
      return
    }

    setKeyword(finalKeyword)
    setLoading(true)
    setError('')
    setSearched(true)
    setResults([])

    // URL 파라미터 업데이트
    const params = new URLSearchParams()
    params.set('q', finalKeyword)
    if (finalRegion) params.set('region', finalRegion)
    if (finalType) params.set('type', finalType)
    window.history.replaceState({}, '', `?${params.toString()}`)

    try {
      const apiParams = {
        KEY: NEIS_API_KEY,
        Type: 'json',
        pIndex: 1,
        pSize: 100,
        SCHUL_NM: finalKeyword,
      }
      if (finalRegion) apiParams.ATPT_OFCDC_SC_CODE = finalRegion
      if (finalType) apiParams.SCHUL_KND_SC_NM = finalType

      const response = await axios.get('https://open.neis.go.kr/hub/schoolInfo', {
        params: apiParams,
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

  // 필터별 통계
  const stats = useMemo(() => {
    const counts = { '초등학교': 0, '중학교': 0, '고등학교': 0, '특수학교': 0, '기타': 0 }
    results.forEach((s) => {
      const t = s.SCHUL_KND_SC_NM || ''
      if (t.includes('초등')) counts['초등학교']++
      else if (t.includes('중')) counts['중학교']++
      else if (t.includes('고')) counts['고등학교']++
      else if (t.includes('특수')) counts['특수학교']++
      else counts['기타']++
    })
    return counts
  }, [results])

  const totalCountText = useMemo(() => {
    if (loading) return '검색 중...'
    if (!searched) return '아직 검색 전'
    return `총 ${results.length}건`
  }, [loading, searched, results.length])

  // URL 공유
  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // 상단으로 이동
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 네이버 지도 열기
  const openNaverMap = (school) => {
    const query = encodeURIComponent(`${school.SCHUL_NM} ${school.ORG_RDNMA || ''}`)
    window.open(`https://map.naver.com/v5/search/${query}`, '_blank', 'noreferrer')
  }

  return (
    <div className="app-shell" ref={topRef}>
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
          {searched && (
            <button type="button" className="share-btn" onClick={handleShare}>
              {copied ? '✅ 복사됨!' : '🔗 공유'}
            </button>
          )}
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <main className="page-container">
        {/* 히어로 */}
        <section className="hero-card">
          <div className="hero-text">
            <div className="hero-chip">NEIS Open API</div>
            <h1>학교 정보 검색</h1>
            <p>초·중·고 학교명을 입력하면 기본 정보와 홈페이지를 빠르게 조회할 수 있습니다.</p>
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
              <button onClick={() => searchSchool()} disabled={loading} className="search-button">
                {loading ? '검색 중...' : '검색'}
              </button>
            </div>

            {/* 필터 */}
            <div className="filter-row">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="filter-select"
              >
                {Object.entries(OFFICE_CODES).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="filter-select"
              >
                {Object.entries(SCHOOL_TYPES).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
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

        {/* 요약 */}
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

        {/* 학교급 통계 배지 */}
        {searched && !loading && results.length > 0 && (
          <div className="stats-row">
            {Object.entries(stats).filter(([, v]) => v > 0).map(([label, count]) => (
              <span
                key={label}
                className={`stat-chip ${
                  label === '초등학교' ? 'type-elementary'
                  : label === '중학교' ? 'type-middle'
                  : label === '고등학교' ? 'type-high'
                  : label === '특수학교' ? 'type-special'
                  : 'type-neutral'
                }`}
              >
                {label} {count}개
              </span>
            ))}
          </div>
        )}

        {/* 결과 헤더 */}
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

        {/* 결과 목록 */}
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
                    {OFFICE_CODES[school.ATPT_OFCDC_SC_CODE] || school.ATPT_OFCDC_SC_CODE || '-'}
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
                      🌐 홈페이지
                    </a>
                  ) : (
                    <span className="site-link disabled">홈페이지 정보 없음</span>
                  )}
                  <button
                    type="button"
                    className="map-btn"
                    onClick={() => openNaverMap(school)}
                  >
                    📍 네이버 지도
                  </button>
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

      {/* 상단으로 이동 버튼 */}
      {showScrollTop && (
        <button type="button" className="scroll-top-btn" onClick={scrollToTop}>
          ↑
        </button>
      )}
    </div>
  )
}

export default App
