// ========================================================================
// JOURNEY DATA
// ========================================================================
const locations = [
    {
        country: "Russia",
        city: "Chaykovsky",
        coordinates: [54.1277, 56.7661],
        startDate: new Date(1985, 8, 19),
        endDate: new Date(2005, 9, 1),
        description: "Born to code"
    },
    {
        country: "Russia",
        city: "Izhevsk",
        coordinates: [53.2324, 56.8619],
        startDate: new Date(2005, 9, 1),
        endDate: new Date(2014, 3, 1),
        description: "Pelmeni & textbooks"
    },
    {
        country: "Russia",
        city: "Moscow",
        coordinates: [37.6173, 55.7558],
        startDate: new Date(2014, 3, 1),
        endDate: new Date(2020, 4, 1),
        description: "Subway warrior"
    },
    {
        country: "Russia",
        city: "St. Petersburg",
        coordinates: [30.3609, 59.9311],
        startDate: new Date(2020, 4, 1),
        endDate: new Date(2022, 2, 4),
        description: "White nights, cold bytes"
    },
    {
        country: "Turkey",
        city: "Antalya",
        coordinates: [30.7133, 36.8969],
        startDate: new Date(2022, 2, 4),
        endDate: new Date(2023, 10, 23),
        description: "Beach office vibes"
    },
    {
        country: "United States",
        city: "Annapolis",
        coordinates: [-76.4896, 38.9764],
        startDate: new Date(2023, 10, 23),
        endDate: new Date(2025, 7, 3),
        description: "American debugger"
    },
    {
        country: "United States",
        city: "San Mateo",
        coordinates: [-122.3263, 37.5666],
        startDate: new Date(2025, 7, 3),
        endDate: null,
        description: "Californication"
    }
];

const realNow = new Date(); // Actual current time (for "Now" label and pulse)

// ========================================================================
// TIME MACHINE CONFIGURATION
// ========================================================================
const TIME_CONFIG = {
    START_YEAR: 1985,
    END_YEAR: realNow.getFullYear(),
    PIXELS_PER_YEAR: 150,
};

// ========================================================================
// INITIALIZATION
// ========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const mapApp = createMapApp(locations);
    mapApp.init();

    // Wait for layout before resizing
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            mapApp.resizeCanvas();
        });
    });

    // Console easter egg
    console.log('Psssst... there\'s more → https://www.instagram.com/ivan.seredkin');
});

// ========================================================================
// MAP APPLICATION FACTORY
// ========================================================================
function createMapApp(locationData) {
    // ====================================================================
    // CONFIGURATION
    // ====================================================================
    const CONFIG = {
        MOBILE_BREAKPOINT: 768,
        MAP_SCALE: {
            MOBILE: 3.5,
            DESKTOP: 6.5
        },
        POINT_RADIUS: {
            MIN: { MOBILE: 8, DESKTOP: 6 },
            MAX: { MOBILE: 24, DESKTOP: 20 }
        },
        POINT_SHADOW_BLUR: 12,
        POINT_SHADOW_OFFSET: 3,
        POINT_BORDER_WIDTH: 1,
        MAP_BORDER_WIDTH: 0.8,
        DEBOUNCE_DELAY: 100,
        COLORS: {
            COUNTRIES: '#f8f8f7',
            BORDERS: '#a8a29e',
            TEXT_NUMBER: '#ffffff'
        }
    };

    // ====================================================================
    // DOM ELEMENTS
    // ====================================================================
    const DOM = {
        container: document.getElementById('map-container'),
        canvas: document.getElementById('map'),
        overlays: document.getElementById('map-overlays'),
        tooltip: document.getElementById('tooltip'),
        // Time Machine elements
        timeMachineWrapper: document.getElementById('time-machine-wrapper'),
        scrollContainer: document.getElementById('time-scroll-container'),
        scrollSpacer: document.getElementById('time-scroll-spacer'),
        mapViewport: document.getElementById('map-viewport'),
        currentDateDisplay: document.getElementById('current-date-display'),
        currentYear: document.getElementById('current-year'),
        timeline: document.getElementById('timeline'),
        timelineTrack: document.getElementById('timeline-track'),
        timelineProgress: document.getElementById('timeline-progress'),
        timelineThumb: document.getElementById('timeline-thumb'),
        timelineMarkers: document.getElementById('timeline-markers'),
        timelineLabels: document.getElementById('timeline-labels'),
        timelineTicks: document.getElementById('timeline-ticks'),
        timelineYears: document.getElementById('timeline-years'),
    };

    // ====================================================================
    // STATE
    // ====================================================================
    let ctx = null;
    let projection = null;
    let path = null;
    let cachedWorldData = null;
    // Time Machine state
    let currentScrollDate = new Date(realNow); // Start at present
    let animationFrameId = null;
    // Button pool for overlay accessibility
    let buttonPool = [];

    // ====================================================================
    // UTILITIES
    // ====================================================================
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    const isMobile = () => window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;

    const formatDate = date => {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
        });
    };

    const getDurationDays = (start, end, now) => {
        const parseDate = d => d instanceof Date ? d : (d ? new Date(d) : now);
        const startDate = parseDate(start);
        const endDate = parseDate(end);
        const diff = Math.abs(endDate - startDate);
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const formatDuration = (start, end, now) => {
        const days = getDurationDays(start, end, now);
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);

        if (years === 0 && months === 0) {
            return days === 1 ? '1 day' : `${days} days`;
        }

        return [
            years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '',
            months > 0 ? `${months} month${months > 1 ? 's' : ''}` : ''
        ].filter(Boolean).join(' ');
    };

    // ====================================================================
    // DATA PIPELINE
    // ====================================================================
    const isAtPresent = (date) =>
        date.getFullYear() === realNow.getFullYear() &&
        date.getMonth() >= realNow.getMonth();

    const getVisibleLocations = (date) => {
        return locationData
            .map((loc, index) => ({ ...loc, originalIndex: index }))
            .filter(loc => date >= loc.startDate);
    };

    const computeLocationData = (visibleLocations, now) => {
        if (!projection || visibleLocations.length === 0) return [];

        const dpr = window.devicePixelRatio || 1;
        const minRadius = isMobile() ? CONFIG.POINT_RADIUS.MIN.MOBILE : CONFIG.POINT_RADIUS.MIN.DESKTOP;
        const maxRadius = isMobile() ? CONFIG.POINT_RADIUS.MAX.MOBILE : CONFIG.POINT_RADIUS.MAX.DESKTOP;

        // For each location, calculate the "effective end" at current scroll position
        // This is min(endDate, now) - so duration grows smoothly as you scroll
        const effectiveEnds = visibleLocations.map(loc => {
            const endTime = loc.endDate instanceof Date ? loc.endDate.getTime() : Infinity;
            // Cap at scroll position - duration grows as you scroll through a location's time
            return new Date(Math.min(endTime, now.getTime()));
        });

        // Compute durations using effective ends
        const durations = visibleLocations.map((loc, i) =>
            getDurationDays(loc.startDate, effectiveEnds[i], effectiveEnds[i])
        );

        // Use SQRT scale for better visual distribution
        // Linear scale makes small durations invisible (21 days vs 7317 days)
        // Sqrt compresses the range so small values are more visible
        // Use realNow (not scroll date) so scale is FIXED - scrolling back shrinks all points
        const maxPossibleDuration = getDurationDays(locationData[0].startDate, realNow, realNow);
        const radiusScale = d3.scaleSqrt(
            [0, maxPossibleDuration],
            [minRadius, maxRadius]
        );

        // Color/opacity: based on "time distance" from scroll position
        // When at present: each location colored by its actual end date (old = light, recent = dark)
        // When scrolling back: ALL locations shift lighter because scroll position is earlier
        const timelineStart = locationData[0].startDate;

        // For each location, calculate how "current" it is at the scroll position
        // A location that just started or is active = dark
        // A location that ended long ago = light
        const getLocationAge = (effectiveEnd) => {
            // Age = how long ago this location ended relative to scroll position
            // 0 = current (just ended or still active), 1 = very old
            const timeSinceEnd = now.getTime() - effectiveEnd.getTime();
            const maxAge = now.getTime() - timelineStart.getTime();
            return Math.max(0, Math.min(1, timeSinceEnd / maxAge));
        };

        const bgColorScale = (effectiveEnd) => {
            const age = getLocationAge(effectiveEnd);
            const t = Math.pow(age, 0.5); // sqrt to expand light end (more contrast for old)
            // Current (age=0) = dark, old (age=1) = light
            const r = Math.round(28 + t * (240 - 28));
            const g = Math.round(25 + t * (240 - 25));
            const b = Math.round(23 + t * (240 - 23));
            return `rgb(${r}, ${g}, ${b})`;
        };
        const borderColorScale = (effectiveEnd) => {
            const age = getLocationAge(effectiveEnd);
            const t = Math.pow(age, 0.5);
            // Current = light border, old = dark border
            const r = Math.round(245 - t * (245 - 170));
            const g = Math.round(245 - t * (245 - 170));
            const b = Math.round(244 - t * (244 - 170));
            return `rgb(${r}, ${g}, ${b})`;
        };
        // Opacity: current location = full opacity, old = faded
        const getOpacity = (effectiveEnd) => {
            const age = getLocationAge(effectiveEnd);
            return 1 - (age * 0.6); // 1.0 for current, 0.4 for oldest
        };

        return visibleLocations.map((loc, i) => {
            const [x, y] = projection(loc.coordinates);
            const isCurrentLocation = loc.originalIndex === locationData.length - 1 && !loc.endDate;

            // Color based on effectiveEnd, but scale endpoint moves with scroll
            const colorDate = effectiveEnds[i];

            return {
                location: loc,
                index: loc.originalIndex,
                x,
                y,
                cssX: x / dpr,
                cssY: y / dpr,
                radius: radiusScale(durations[i]),
                backgroundColor: bgColorScale(colorDate),
                borderColor: borderColorScale(colorDate),
                opacity: getOpacity(colorDate),
                shouldPulse: isCurrentLocation && isAtPresent(now),
                durationDays: durations[i],
            };
        });
    };

    // ====================================================================
    // TIME MACHINE UTILITIES
    // ====================================================================
    const scrollToDate = (scrollTop) => {
        const maxScroll = DOM.scrollContainer.scrollHeight - DOM.scrollContainer.clientHeight;
        if (maxScroll <= 0) return new Date(realNow);

        const scrollProgress = Math.max(0, Math.min(1, scrollTop / maxScroll));
        const startDate = new Date(TIME_CONFIG.START_YEAR, 0, 1);
        const endDate = new Date(TIME_CONFIG.END_YEAR, 11, 31);
        const totalMs = endDate.getTime() - startDate.getTime();
        const currentMs = startDate.getTime() + (scrollProgress * totalMs);

        return new Date(currentMs);
    };

    const dateToScroll = (date) => {
        const startDate = new Date(TIME_CONFIG.START_YEAR, 0, 1);
        const endDate = new Date(TIME_CONFIG.END_YEAR, 11, 31);
        const totalMs = endDate.getTime() - startDate.getTime();
        const dateMs = Math.max(startDate.getTime(), Math.min(endDate.getTime(), date.getTime()));
        const progress = (dateMs - startDate.getTime()) / totalMs;
        const maxScroll = DOM.scrollContainer.scrollHeight - DOM.scrollContainer.clientHeight;

        return progress * maxScroll;
    };

    const updateScrollHeight = () => {
        const viewportHeight = DOM.timeMachineWrapper.clientHeight;
        const totalYears = TIME_CONFIG.END_YEAR - TIME_CONFIG.START_YEAR;
        const height = viewportHeight + (totalYears * TIME_CONFIG.PIXELS_PER_YEAR);
        DOM.scrollSpacer.style.height = `${height}px`;
    };

    const scrollToPresent = () => {
        requestAnimationFrame(() => {
            DOM.scrollContainer.scrollTop = DOM.scrollContainer.scrollHeight - DOM.scrollContainer.clientHeight;
            currentScrollDate = new Date(realNow);
        });
    };

    // ====================================================================
    // PROJECTION & CANVAS
    // ====================================================================
    const createProjection = (width, height) => {
        const longitudes = locationData.map(loc => loc.coordinates[0]);
        const latitudes = locationData.map(loc => loc.coordinates[1]);

        const centerLon = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
        const centerLat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;

        const scaleFactor = isMobile() ? CONFIG.MAP_SCALE.MOBILE : CONFIG.MAP_SCALE.DESKTOP;

        return d3.geoMercator()
            .center([centerLon, centerLat])
            .scale(width / scaleFactor)
            .translate([width / 2, height / 2]);
    };

    const resizeCanvas = () => {
        // Container size is handled by flexbox, just update canvas
        const dpr = window.devicePixelRatio || 1;
        const width = DOM.container.clientWidth;
        const height = DOM.container.clientHeight;

        DOM.canvas.width = width * dpr;
        DOM.canvas.height = height * dpr;
        DOM.canvas.style.width = `${width}px`;
        DOM.canvas.style.height = `${height}px`;

        projection = createProjection(DOM.canvas.width, DOM.canvas.height);
        path = d3.geoPath().projection(projection).context(ctx);

        drawMap();
    };

    // ====================================================================
    // BUTTON POOL
    // ====================================================================
    const createButton = () => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'map-overlay-btn';
        btn.setAttribute('tabindex', '0');
        Object.assign(btn.style, {
            position: 'absolute',
            border: 'none',
            borderRadius: '50%',
            background: 'transparent',
            padding: '0',
            margin: '0',
            cursor: 'pointer',
            pointerEvents: 'auto',
        });

        // Event handlers reference btn.dataset for current data
        btn.addEventListener('focus', () => {
            const rect = btn.getBoundingClientRect();
            showTooltip(JSON.parse(btn.dataset.location), rect.left + rect.width / 2, rect.top + rect.height / 2, parseFloat(btn.dataset.cssRadius));
        });
        btn.addEventListener('blur', hideTooltip);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const rect = btn.getBoundingClientRect();
            showTooltip(JSON.parse(btn.dataset.location), rect.left + rect.width / 2, rect.top + rect.height / 2, parseFloat(btn.dataset.cssRadius));
        });
        btn.addEventListener('mouseenter', () => {
            const rect = btn.getBoundingClientRect();
            showTooltip(JSON.parse(btn.dataset.location), rect.left + rect.width / 2, rect.top + rect.height / 2, parseFloat(btn.dataset.cssRadius));
        });
        btn.addEventListener('mouseleave', hideTooltip);

        return btn;
    };

    const updateButton = (btn, data) => {
        const { location, cssX, cssY, radius, shouldPulse } = data;
        const dpr = window.devicePixelRatio || 1;
        const cssRadius = radius + CONFIG.POINT_BORDER_WIDTH / dpr;

        const startDateStr = formatDate(location.startDate);
        const endDateStr = location.endDate ? formatDate(location.endDate) : 'Present';
        const durationStr = formatDuration(location.startDate, location.endDate, currentScrollDate);
        const label = `${location.city}, ${location.country}. From ${startDateStr} to ${endDateStr} (${durationStr})`;

        btn.className = 'map-overlay-btn' + (shouldPulse ? ' i-am-here' : '');
        btn.setAttribute('aria-label', label);
        btn.style.left = `${cssX - cssRadius}px`;
        btn.style.top = `${cssY - cssRadius}px`;
        btn.style.width = `${cssRadius * 2}px`;
        btn.style.height = `${cssRadius * 2}px`;
        btn.style.display = '';
        btn.innerHTML = `<span>${label}</span>`;

        // Store data for event handlers
        btn.dataset.location = JSON.stringify(location);
        btn.dataset.cssRadius = cssRadius;
    };

    const updateOverlayButtons = (computedData) => {
        const neededCount = computedData.length;

        // Create more buttons if needed
        while (buttonPool.length < neededCount) {
            const btn = createButton();
            buttonPool.push(btn);
            DOM.overlays.appendChild(btn);
        }

        // Update existing buttons with new data
        computedData.forEach((data, i) => {
            updateButton(buttonPool[i], data);
        });

        // Hide excess buttons
        for (let i = neededCount; i < buttonPool.length; i++) {
            buttonPool[i].style.display = 'none';
        }
    };

    // ====================================================================
    // DRAWING FUNCTIONS
    // ====================================================================
    const drawMapBase = () => {
        if (!ctx || !cachedWorldData) return;

        ctx.clearRect(0, 0, DOM.canvas.width, DOM.canvas.height);

        // Draw countries
        ctx.beginPath();
        path(topojson.feature(cachedWorldData, cachedWorldData.objects.countries));
        ctx.fillStyle = CONFIG.COLORS.COUNTRIES;
        ctx.fill();

        // Draw borders
        ctx.beginPath();
        path(topojson.mesh(cachedWorldData, cachedWorldData.objects.countries));
        ctx.strokeStyle = CONFIG.COLORS.BORDERS;
        ctx.lineWidth = CONFIG.MAP_BORDER_WIDTH;
        ctx.stroke();
    };

    const drawPoint = (data) => {
        const { x, y, index, radius, backgroundColor, borderColor, opacity } = data;
        const dpr = window.devicePixelRatio || 1;

        // Draw point with shadow
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = CONFIG.POINT_SHADOW_BLUR * dpr;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = CONFIG.POINT_SHADOW_OFFSET * dpr;
        ctx.beginPath();
        ctx.arc(x, y, radius * dpr, 0, 2 * Math.PI);
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = CONFIG.POINT_BORDER_WIDTH * dpr;
        ctx.stroke();
        ctx.restore();

        // Draw order number
        const orderNumber = index + 1;
        const fontSize = Math.max(8, radius * 0.9) * dpr;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CONFIG.COLORS.TEXT_NUMBER;
        ctx.fillText(orderNumber.toString(), x, y);
    };

    const render = (computedData) => {
        drawMapBase();
        computedData.forEach(data => drawPoint(data));
        updateOverlayButtons(computedData);
    };

    const drawMap = async () => {
        if (!ctx) return;

        // Cache world data on first load
        if (!cachedWorldData) {
            try {
                cachedWorldData = await d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
            } catch (error) {
                console.error('Error loading world data:', error);
                return;
            }
        }

        // Use the new pipeline
        const visible = getVisibleLocations(currentScrollDate);
        const computed = computeLocationData(visible, currentScrollDate);
        render(computed);
    };

    // ====================================================================
    // INTERACTION HANDLERS
    // ====================================================================
    const showTooltip = (location, x, y, buttonRadius) => {
        const now = currentScrollDate;
        const startDate = location.startDate instanceof Date ? location.startDate : new Date(location.startDate);
        const endDate = location.endDate ? (location.endDate instanceof Date ? location.endDate : new Date(location.endDate)) : null;

        // Effective end is capped at scroll position
        const effectiveEnd = endDate && endDate < now ? endDate : now;
        const hasEnded = endDate && endDate <= now;

        const startDateStr = formatDate(startDate);
        const endDateStr = hasEnded ? formatDate(endDate) : 'Present';

        // Time spent: from start to effective end (respects scroll position)
        const durationStr = formatDuration(startDate, effectiveEnd, now);

        // Time passed: only if location ended before scroll position
        const distanceStr = hasEnded
            ? formatDuration(endDate, now, now)
            : 'Current';

        DOM.tooltip.innerHTML = `
            <strong>${location.city}, ${location.country}</strong><br>
            <small>🗓️ ${startDateStr} — ${endDateStr}</small><br>
            <small>⏳ Time Spent: ${durationStr}</small><br>
            <small>⏰ Time Passed: ${distanceStr}</small><br>
        `;

        DOM.tooltip.style.display = 'block';

        // Smart tooltip positioning with viewport boundary detection
        const tooltipRect = DOM.tooltip.getBoundingClientRect();
        const gap = 8;
        const offset = buttonRadius + gap;

        // Position to the right, with top edge aligned with button top edge
        let left = x + offset;
        let top = y + offset;

        // If doesn't fit on right, try left
        if (left + tooltipRect.width > window.innerWidth - gap) {
            left = x - tooltipRect.width - offset;
        }

        // Ensure tooltip stays within viewport bounds
        if (left < gap) {
            left = gap;
        }

        // Vertical adjustments to keep in viewport
        if (top < gap) {
            top = gap;
        }
        if (top + tooltipRect.height > window.innerHeight - gap) {
            top = window.innerHeight - tooltipRect.height - gap;
        }

        // Tooltip is positioned relative to #map-container, not viewport
        const containerRect = DOM.container.getBoundingClientRect();
        const finalLeft = left - containerRect.left;
        const finalTop = top - containerRect.top;

        DOM.tooltip.style.left = `${finalLeft}px`;
        DOM.tooltip.style.top = `${finalTop}px`;
    };

    const hideTooltip = () => {
        DOM.tooltip.style.display = 'none';
    };

    // ====================================================================
    // TIME MACHINE UI
    // ====================================================================
    const updateDateDisplay = () => {
        DOM.currentYear.textContent = isAtPresent(currentScrollDate) ? 'Now' : currentScrollDate.getFullYear();
    };

    const initTimeline = () => {
        // Generate years at 5-year intervals from START_YEAR to END_YEAR
        const yearsToShow = [];
        for (let year = TIME_CONFIG.START_YEAR; year <= TIME_CONFIG.END_YEAR; year += 5) {
            yearsToShow.push(year);
        }
        const startDate = new Date(TIME_CONFIG.START_YEAR, 0, 1);
        const endDate = new Date(TIME_CONFIG.END_YEAR, 11, 31);
        const totalMs = endDate.getTime() - startDate.getTime();
        const mobile = isMobile();

        // Helper to calculate position from date
        const getPosition = (date) => {
            const dateMs = date.getTime() - startDate.getTime();
            return (dateMs / totalMs) * 100;
        };

        // Helper to set position based on orientation
        const setPosition = (el, position) => {
            if (mobile) {
                el.style.left = `${position}%`;
                el.style.top = '';
            } else {
                el.style.top = `${position}%`;
                el.style.left = '';
            }
        };

        // Create year tick marks (only for labeled years)
        DOM.timelineTicks.innerHTML = '';
        yearsToShow.forEach(year => {
            if (year > TIME_CONFIG.END_YEAR) return;
            const tick = document.createElement('div');
            tick.className = 'timeline-tick';
            tick.dataset.year = year;
            const position = getPosition(new Date(year, 0, 1));
            setPosition(tick, position);
            DOM.timelineTicks.appendChild(tick);
        });

        // Create year labels
        DOM.timelineYears.innerHTML = '';
        yearsToShow.forEach(year => {
            if (year > TIME_CONFIG.END_YEAR) return;

            const yearEl = document.createElement('div');
            yearEl.className = 'timeline-year';
            yearEl.textContent = year;
            yearEl.dataset.year = year;

            const position = getPosition(new Date(year, 0, 1));
            setPosition(yearEl, position);

            yearEl.addEventListener('click', () => {
                const targetDate = new Date(year, 0, 1);
                const targetScroll = dateToScroll(targetDate);
                DOM.scrollContainer.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            });

            DOM.timelineYears.appendChild(yearEl);
        });

        // Create markers and labels for each location's start date
        DOM.timelineMarkers.innerHTML = '';
        DOM.timelineLabels.innerHTML = '';
        locationData.forEach((location, index) => {
            const position = getPosition(location.startDate);

            // Create marker
            const marker = document.createElement('div');
            marker.className = 'timeline-marker';
            marker.dataset.index = index;
            marker.title = `${location.city} (${location.startDate.getFullYear()})`;
            setPosition(marker, position);

            marker.addEventListener('click', () => {
                const targetScroll = dateToScroll(location.startDate);
                DOM.scrollContainer.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            });

            DOM.timelineMarkers.appendChild(marker);

            // Create label
            const label = document.createElement('div');
            label.className = 'timeline-label';
            label.textContent = location.city;
            label.dataset.index = index;
            setPosition(label, position);
            DOM.timelineLabels.appendChild(label);
        });
    };

    const updateTimeline = () => {
        const startDate = new Date(TIME_CONFIG.START_YEAR, 0, 1);
        const endDate = new Date(TIME_CONFIG.END_YEAR, 11, 31);
        const totalMs = endDate.getTime() - startDate.getTime();
        const currentMs = Math.max(startDate.getTime(), Math.min(endDate.getTime(), currentScrollDate.getTime()));
        const progress = (currentMs - startDate.getTime()) / totalMs;
        const mobile = isMobile();

        // Update progress bar and thumb position
        if (mobile) {
            DOM.timelineProgress.style.width = `${progress * 100}%`;
            DOM.timelineProgress.style.height = '100%';
            DOM.timelineThumb.style.left = `${progress * 100}%`;
            DOM.timelineThumb.style.top = '50%';
        } else {
            DOM.timelineProgress.style.height = `${progress * 100}%`;
            DOM.timelineProgress.style.width = '';
            DOM.timelineThumb.style.top = `${progress * 100}%`;
            DOM.timelineThumb.style.left = '';
        }

        // Update year label and tick highlights (past = dark)
        const currentYear = currentScrollDate.getFullYear();
        DOM.timelineYears.querySelectorAll('.timeline-year').forEach(yearEl => {
            const year = parseInt(yearEl.dataset.year);
            yearEl.classList.toggle('past', year <= currentYear);
        });

        DOM.timelineTicks.querySelectorAll('.timeline-tick').forEach(tick => {
            const year = parseInt(tick.dataset.year);
            tick.classList.toggle('past', year <= currentYear);
        });

        // Update marker and label highlights
        // "visible" = location has started (black)
        // "active" = currently at this location (black + scaled)
        DOM.timelineMarkers.querySelectorAll('.timeline-marker').forEach((marker, index) => {
            const location = locationData[index];
            const locEndDate = location.endDate || realNow;
            const isVisible = currentScrollDate >= location.startDate;
            const isActive = isVisible && currentScrollDate <= locEndDate;

            marker.classList.toggle('visible', isVisible && !isActive);
            marker.classList.toggle('active', isActive);
        });

        DOM.timelineLabels.querySelectorAll('.timeline-label').forEach((label, index) => {
            const location = locationData[index];
            const isVisible = currentScrollDate >= location.startDate;

            label.classList.toggle('visible', isVisible);
        });
    };

    const initTimelineDrag = () => {
        let isDragging = false;

        const getProgressFromPosition = (clientX, clientY) => {
            const trackRect = DOM.timelineTrack.getBoundingClientRect();
            if (isMobile()) {
                const x = clientX - trackRect.left;
                return Math.max(0, Math.min(1, x / trackRect.width));
            } else {
                const y = clientY - trackRect.top;
                return Math.max(0, Math.min(1, y / trackRect.height));
            }
        };

        const updateFromProgress = (progress) => {
            const startDate = new Date(TIME_CONFIG.START_YEAR, 0, 1);
            const endDate = new Date(TIME_CONFIG.END_YEAR, 11, 31);
            const totalMs = endDate.getTime() - startDate.getTime();
            const targetDate = new Date(startDate.getTime() + progress * totalMs);
            const targetScroll = dateToScroll(targetDate);
            DOM.scrollContainer.scrollTop = targetScroll;
        };

        // Mouse events for thumb
        DOM.timelineThumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            DOM.timelineThumb.classList.add('dragging');
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        });

        // Mouse events for track (click to jump)
        DOM.timelineTrack.addEventListener('click', (e) => {
            if (e.target === DOM.timelineThumb) return;
            const progress = getProgressFromPosition(e.clientX, e.clientY);
            updateFromProgress(progress);
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const progress = getProgressFromPosition(e.clientX, e.clientY);
            updateFromProgress(progress);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                DOM.timelineThumb.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });

        // Touch events for thumb
        DOM.timelineThumb.addEventListener('touchstart', (e) => {
            isDragging = true;
            DOM.timelineThumb.classList.add('dragging');
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            const progress = getProgressFromPosition(touch.clientX, touch.clientY);
            updateFromProgress(progress);
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                DOM.timelineThumb.classList.remove('dragging');
            }
        });
    };

    const initPageWheel = () => {
        // Listen for wheel events on the entire page
        document.addEventListener('wheel', (e) => {
            e.preventDefault();
            // Scroll the time machine container based on wheel delta
            DOM.scrollContainer.scrollTop += e.deltaY;
        }, { passive: false });
    };

    const initPageTouch = () => {
        let touchStart = null;
        let lastTouch = null;

        document.addEventListener('touchstart', (e) => {
            // Don't interfere with timeline thumb dragging
            if (e.target.closest('#timeline')) return;

            const touch = e.touches[0];
            touchStart = { x: touch.clientX, y: touch.clientY };
            lastTouch = { ...touchStart };
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (touchStart === null) return;
            // Don't interfere with timeline thumb dragging
            if (e.target.closest('#timeline')) return;

            const touch = e.touches[0];
            const mobile = isMobile();

            // On mobile: horizontal swipe (left = forward, right = backward)
            // On desktop: vertical swipe (up = forward, down = backward)
            if (mobile) {
                const deltaX = lastTouch.x - touch.clientX;
                DOM.scrollContainer.scrollTop += deltaX;
            } else {
                const deltaY = lastTouch.y - touch.clientY;
                DOM.scrollContainer.scrollTop += deltaY;
            }

            lastTouch = { x: touch.clientX, y: touch.clientY };
        }, { passive: true });

        document.addEventListener('touchend', () => {
            touchStart = null;
            lastTouch = null;
        }, { passive: true });
    };

    const handleScroll = () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = requestAnimationFrame(() => {
            currentScrollDate = scrollToDate(DOM.scrollContainer.scrollTop);

            // Simple pipeline: filter → compute → render
            const visible = getVisibleLocations(currentScrollDate);
            const computed = computeLocationData(visible, currentScrollDate);

            render(computed);

            updateDateDisplay();
            updateTimeline();
        });
    };

    // ====================================================================
    // INITIALIZATION
    // ====================================================================
    const init = () => {
        ctx = DOM.canvas.getContext('2d');
        if (!ctx) {
            console.error('Failed to get 2D canvas context');
            DOM.container.innerHTML = '<p style="text-align:center;padding:2rem;">Canvas not supported in your browser</p>';
            return;
        }

        // Initialize Time Machine
        updateScrollHeight();
        initTimeline();
        initTimelineDrag();
        initPageWheel();
        initPageTouch();
        updateDateDisplay();
        scrollToPresent();

        // Set up scroll handler
        DOM.scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

        // Set up resize handlers
        const debouncedResize = debounce(() => {
            requestAnimationFrame(() => {
                // Preserve current date position
                const savedDate = new Date(currentScrollDate.getTime());
                updateScrollHeight();
                // Restore scroll position based on saved date
                requestAnimationFrame(() => {
                    DOM.scrollContainer.scrollTop = dateToScroll(savedDate);
                    currentScrollDate = savedDate;
                });
                resizeCanvas();
                initTimeline(); // Reinit for mobile/desktop switch
                updateTimeline();
            });
        }, CONFIG.DEBOUNCE_DELAY);

        window.addEventListener('resize', debouncedResize);

        // Handle orientation change immediately without debounce
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                requestAnimationFrame(() => {
                    const savedDate = new Date(currentScrollDate.getTime());
                    updateScrollHeight();
                    requestAnimationFrame(() => {
                        DOM.scrollContainer.scrollTop = dateToScroll(savedDate);
                    });
                    resizeCanvas();
                    initTimeline(); // Reinit for orientation switch
                    updateTimeline();
                });
            }, 50);
        });

        // Initial draw
        resizeCanvas();
    };

    // ====================================================================
    // PUBLIC API
    // ====================================================================
    return { init, resizeCanvas };
}
