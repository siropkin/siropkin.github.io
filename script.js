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
        startDate: new Date(2005, 9, 2),
        endDate: new Date(2014, 3, 1),
        description: "Pelmeni & textbooks"
    },
    {
        country: "Russia",
        city: "Moscow",
        coordinates: [37.6173, 55.7558],
        startDate: new Date(2014, 3, 2),
        endDate: new Date(2020, 4, 1),
        description: "Subway warrior"
    },
    {
        country: "Russia",
        city: "St. Petersburg",
        coordinates: [30.3609, 59.9311],
        startDate: new Date(2020, 4, 2),
        endDate: new Date(2022, 2, 3),
        description: "White nights, cold bytes"
    },
    {
        country: "Turkey",
        city: "Antalya",
        coordinates: [30.7133, 36.8969],
        startDate: new Date(2022, 2, 4),
        endDate: new Date(2023, 10, 22),
        description: "Beach office vibes"
    },
    {
        country: "United States",
        city: "Annapolis",
        coordinates: [-76.4896, 38.9764],
        startDate: new Date(2023, 10, 23),
        endDate: new Date(2025, 7, 2),
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
// GLOBAL CONFIGURATION - Single source of truth
// ========================================================================
const CONFIG = {
    // Responsive breakpoints
    BREAKPOINTS: {
        MOBILE: 768
    },

    // Time Machine settings
    TIME: {
        START_YEAR: 1985,
        END_YEAR: realNow.getFullYear(),
        PIXELS_PER_YEAR: 150,
        SCROLL_DELAY: 100,
        SMOOTH_SCROLL_DELAY: 500,
    },

    // Map display settings
    MAP: {
        SCALE: { MOBILE: 3.5, DESKTOP: 6.5 },
        BORDER_WIDTH: 0.8,
    },

    // Point styling
    POINT: {
        RADIUS_MIN: { MOBILE: 8, DESKTOP: 6 },
        RADIUS_MAX: { MOBILE: 24, DESKTOP: 20 },
        SHADOW_BLUR: 12,
        SHADOW_OFFSET: 3,
        BORDER_WIDTH: 1,
    },

    // Colors - synced with CSS variables
    COLORS: {
        // Canvas colors from CSS
        COUNTRY: null, // Will be set from CSS
        BORDER: null,  // Will be set from CSS
        TEXT_NUMBER: null, // Will be set from CSS
        // Point color interpolation
        BG_INTERPOLATION: {
            START: [28, 25, 23],
            END: [240, 240, 240]
        },
        BORDER_INTERPOLATION: {
            START: [245, 245, 244],
            END: [170, 170, 170]
        },
        OPACITY: { MIN: 0.4, MAX: 1.0 },
    },

    // General settings
    DEBOUNCE_DELAY: 100,
};

// ========================================================================
// UTILITIES
// ========================================================================

// Helper to read CSS variables
const getCSSVar = (varName) => {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(varName).trim();
};

// Check if mobile viewport
const isMobile = () => window.innerWidth <= CONFIG.BREAKPOINTS.MOBILE;

// Debounce utility
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

// Throttle utility - executes immediately then limits rate
const throttle = (func, delay) => {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func(...args);
        }
    };
};

// Date utilities - consolidated
const DateUtils = {
    format: (date) => {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
        });
    },

    getDurationDays: (start, end, now = new Date()) => {
        const parseDate = (d) => d instanceof Date ? d : (d ? new Date(d) : now);
        const startDate = parseDate(start);
        const endDate = parseDate(end);
        return Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24));
    },

    formatDuration: (start, end, now = new Date()) => {
        const days = DateUtils.getDurationDays(start, end, now);
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30);

        if (years === 0 && months === 0) {
            return days === 1 ? '1 day' : `${days} days`;
        }

        return [
            years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '',
            months > 0 ? `${months} month${months > 1 ? 's' : ''}` : ''
        ].filter(Boolean).join(' ');
    }
};

// Color interpolation utility
const ColorInterpolator = {
    create: (startRGB, endRGB, power = 0.5) => (age) => {
        const t = Math.pow(age, power);
        const r = Math.round(startRGB[0] + t * (endRGB[0] - startRGB[0]));
        const g = Math.round(startRGB[1] + t * (endRGB[1] - startRGB[1]));
        const b = Math.round(startRGB[2] + t * (endRGB[2] - startRGB[2]));
        return `rgb(${r}, ${g}, ${b})`;
    }
};

// ========================================================================
// INITIALIZATION
// ========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize colors from CSS
    CONFIG.COLORS.COUNTRY = getCSSVar('--color-canvas-country');
    CONFIG.COLORS.BORDER = getCSSVar('--color-canvas-border');
    CONFIG.COLORS.TEXT_NUMBER = getCSSVar('--color-canvas-text');
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
        timelineStops: document.getElementById('timeline-stops'),
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
    let isProgrammaticScroll = false; // Track if scroll is programmatic
    let selectedLocationIndex = null;
    // Button pool for overlay accessibility
    let buttonPool = [];
    let timelineStopButtons = [];


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
        const minRadius = isMobile() ? CONFIG.POINT.RADIUS_MIN.MOBILE : CONFIG.POINT.RADIUS_MIN.DESKTOP;
        const maxRadius = isMobile() ? CONFIG.POINT.RADIUS_MAX.MOBILE : CONFIG.POINT.RADIUS_MAX.DESKTOP;

        // For each location, calculate the "effective end" at current scroll position
        // This is min(endDate, now) - so duration grows smoothly as you scroll
        const effectiveEnds = visibleLocations.map(loc => {
            const endTime = loc.endDate instanceof Date ? loc.endDate.getTime() : Infinity;
            // Cap at scroll position - duration grows as you scroll through a location's time
            return new Date(Math.min(endTime, now.getTime()));
        });

        // Compute durations using effective ends
        const durations = visibleLocations.map((loc, i) =>
            DateUtils.getDurationDays(loc.startDate, effectiveEnds[i], effectiveEnds[i])
        );

        // Use SQRT scale for better visual distribution
        // Linear scale makes small durations invisible (21 days vs 7317 days)
        // Sqrt compresses the range so small values are more visible
        // Use realNow (not scroll date) so scale is FIXED - scrolling back shrinks all points
        const maxPossibleDuration = DateUtils.getDurationDays(locationData[0].startDate, realNow, realNow);
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

        // Create color interpolators using utility
        const bgColorInterpolator = ColorInterpolator.create(
            CONFIG.COLORS.BG_INTERPOLATION.START,
            CONFIG.COLORS.BG_INTERPOLATION.END,
            0.5
        );

        const borderColorInterpolator = ColorInterpolator.create(
            CONFIG.COLORS.BORDER_INTERPOLATION.START,
            CONFIG.COLORS.BORDER_INTERPOLATION.END,
            0.5
        );

        // Color scale functions that use age
        const bgColorScale = (effectiveEnd) => {
            const age = getLocationAge(effectiveEnd);
            return bgColorInterpolator(age);
        };

        const borderColorScale = (effectiveEnd) => {
            const age = getLocationAge(effectiveEnd);
            return borderColorInterpolator(age);
        };

        // Opacity: current location = full opacity, old = faded
        const getOpacity = (effectiveEnd) => {
            const age = getLocationAge(effectiveEnd);
            return CONFIG.COLORS.OPACITY.MAX - (age * (CONFIG.COLORS.OPACITY.MAX - CONFIG.COLORS.OPACITY.MIN));
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
        const startDate = new Date(CONFIG.TIME.START_YEAR, 0, 1);
        const endDate = new Date(CONFIG.TIME.END_YEAR, 11, 31);
        const totalMs = endDate.getTime() - startDate.getTime();
        const currentMs = startDate.getTime() + (scrollProgress * totalMs);

        return new Date(currentMs);
    };

    const dateToScroll = (date) => {
        const startDate = new Date(CONFIG.TIME.START_YEAR, 0, 1);
        const endDate = new Date(CONFIG.TIME.END_YEAR, 11, 31);
        const totalMs = endDate.getTime() - startDate.getTime();
        const dateMs = Math.max(startDate.getTime(), Math.min(endDate.getTime(), date.getTime()));
        const progress = (dateMs - startDate.getTime()) / totalMs;
        const maxScroll = DOM.scrollContainer.scrollHeight - DOM.scrollContainer.clientHeight;

        return progress * maxScroll;
    };

    const updateScrollHeight = () => {
        const viewportHeight = DOM.timeMachineWrapper.clientHeight;
        const totalYears = CONFIG.TIME.END_YEAR - CONFIG.TIME.START_YEAR;
        const height = viewportHeight + (totalYears * CONFIG.TIME.PIXELS_PER_YEAR);
        DOM.scrollSpacer.style.height = `${height}px`;
    };

    const withProgrammaticScroll = (action, delay = CONFIG.TIME.SCROLL_DELAY) => {
        isProgrammaticScroll = true;
        action();
        setTimeout(() => { isProgrammaticScroll = false; }, delay);
    };

    const scrollToPresent = () => {
        requestAnimationFrame(() => {
            withProgrammaticScroll(() => {
                DOM.scrollContainer.scrollTop = DOM.scrollContainer.scrollHeight - DOM.scrollContainer.clientHeight;
                currentScrollDate = new Date(realNow);
            });
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

        const scaleFactor = isMobile() ? CONFIG.MAP.SCALE.MOBILE : CONFIG.MAP.SCALE.DESKTOP;

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
    const showButtonTooltip = (btn) => {
        const rect = btn.getBoundingClientRect();
        showTooltip(
            JSON.parse(btn.dataset.location),
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            parseFloat(btn.dataset.cssRadius)
        );
    };

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
        btn.addEventListener('focus', () => showButtonTooltip(btn));
        btn.addEventListener('blur', hideTooltip);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const index = Number.parseInt(btn.dataset.index, 10);
            if (Number.isFinite(index)) {
                selectedLocationIndex = index;
                updateTimeline();
                // Re-render to apply selected styles before showing tooltip
                const visible = getVisibleLocations(currentScrollDate);
                const computed = computeLocationData(visible, currentScrollDate);
                render(computed);
            }
            showButtonTooltip(btn);
        });
        btn.addEventListener('mouseenter', () => showButtonTooltip(btn));
        btn.addEventListener('mouseleave', hideTooltip);

        return btn;
    };

    const updateButton = (btn, data, isSelected) => {
        const { location, cssX, cssY, radius, shouldPulse } = data;
        const dpr = window.devicePixelRatio || 1;
        const cssRadius = radius + CONFIG.POINT.BORDER_WIDTH / dpr;

        const startDateStr = DateUtils.format(location.startDate);
        const endDateStr = location.endDate ? DateUtils.format(location.endDate) : 'Present';
        const durationStr = DateUtils.formatDuration(location.startDate, location.endDate, currentScrollDate);
        const label = `${location.city}, ${location.country}. From ${startDateStr} to ${endDateStr} (${durationStr})`;

        btn.className = `map-overlay-btn${shouldPulse ? ' i-am-here' : ''}${isSelected ? ' is-selected' : ''}`;
        btn.setAttribute('aria-label', label);
        btn.style.left = `${cssX - cssRadius}px`;
        btn.style.top = `${cssY - cssRadius}px`;
        btn.style.width = `${cssRadius * 2}px`;
        btn.style.height = `${cssRadius * 2}px`;
        btn.style.display = '';
        btn.innerHTML = `<span class="sr-only">${label}</span>`;

        // Store data for event handlers
        btn.dataset.location = JSON.stringify(location);
        btn.dataset.cssRadius = cssRadius;
        btn.dataset.index = String(data.index);
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
            updateButton(buttonPool[i], data, data.index === selectedLocationIndex);
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
        ctx.fillStyle = CONFIG.COLORS.COUNTRY;
        ctx.fill();

        // Draw borders
        ctx.beginPath();
        path(topojson.mesh(cachedWorldData, cachedWorldData.objects.countries));
        ctx.strokeStyle = CONFIG.COLORS.BORDER;
        ctx.lineWidth = CONFIG.MAP.BORDER_WIDTH;
        ctx.stroke();
    };

    const drawPoint = (data) => {
        const { x, y, index, radius, backgroundColor, borderColor, opacity } = data;
        const dpr = window.devicePixelRatio || 1;

        // Draw point with shadow
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = CONFIG.POINT.SHADOW_BLUR * dpr;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = CONFIG.POINT.SHADOW_OFFSET * dpr;
        ctx.beginPath();
        ctx.arc(x, y, radius * dpr, 0, 2 * Math.PI);
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = CONFIG.POINT.BORDER_WIDTH * dpr;
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

        const startDateStr = DateUtils.format(startDate);
        const endDateStr = hasEnded ? DateUtils.format(endDate) : 'Present';

        // Time spent: from start to effective end (respects scroll position)
        const durationStr = DateUtils.formatDuration(startDate, effectiveEnd, now);

        // Time passed: only if location ended before scroll position
        const distanceStr = hasEnded
            ? DateUtils.formatDuration(endDate, now, now)
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

    const rerenderCurrentMapState = () => {
        const visible = getVisibleLocations(currentScrollDate);
        const computed = computeLocationData(visible, currentScrollDate);
        render(computed);
    };

    const focusLocationFromTimeline = (index) => {
        selectedLocationIndex = index;
        updateTimeline();
        rerenderCurrentMapState();

        const selectedBtn = buttonPool.find((btn) =>
            btn.style.display !== 'none' &&
            Number.parseInt(btn.dataset.index, 10) === index
        );

        if (selectedBtn) {
            showButtonTooltip(selectedBtn);
        } else {
            hideTooltip();
        }
    };

    const clearLocationFocus = () => {
        if (selectedLocationIndex === null) return;
        selectedLocationIndex = null;
        updateTimeline();
        rerenderCurrentMapState();
        hideTooltip();
    };

    // ====================================================================
    // TIME MACHINE UI
    // ====================================================================
    const getCurrentLocationIndex = (date = currentScrollDate) => {
        let activeIndex = 0;

        for (let i = 0; i < locationData.length; i++) {
            const location = locationData[i];
            const locEndDate = location.endDate || realNow;

            if (date >= location.startDate && date <= locEndDate) {
                return i;
            }

            if (date >= location.startDate) {
                activeIndex = i;
            }
        }

        return activeIndex;
    };

    const getLocationAgeAtDate = (location, date = currentScrollDate) => {
        const timelineStartMs = locationData[0].startDate.getTime();
        const nowMs = date.getTime();
        const locationEndMs = location.endDate ? location.endDate.getTime() : nowMs;
        const effectiveEndMs = Math.min(locationEndMs, nowMs);
        const maxAge = Math.max(1, nowMs - timelineStartMs);
        const timeSinceEnd = Math.max(0, nowMs - effectiveEndMs);
        return Math.max(0, Math.min(1, timeSinceEnd / maxAge));
    };

    const timelineTextColorInterpolator = ColorInterpolator.create(
        CONFIG.COLORS.BG_INTERPOLATION.START,
        CONFIG.COLORS.BG_INTERPOLATION.END,
        0.5
    );

    const getTimelineTextColor = (location, date = currentScrollDate) => {
        // Keep map-like age tinting but cap at readable lightness.
        const age = getLocationAgeAtDate(location, date);
        const readableAge = Math.min(0.72, age);
        return timelineTextColorInterpolator(readableAge);
    };

    const jumpToLocation = (index, smooth = true) => {
        const safeIndex = Math.max(0, Math.min(locationData.length - 1, index));
        const targetDate = locationData[safeIndex].startDate;
        const targetScroll = dateToScroll(targetDate);

        withProgrammaticScroll(() => {
            DOM.scrollContainer.scrollTo({
                top: targetScroll,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }, smooth ? CONFIG.TIME.SMOOTH_SCROLL_DELAY : CONFIG.TIME.SCROLL_DELAY);
    };

    const initTimeline = () => {
        if (!DOM.timelineStops) return;

        DOM.timelineStops.innerHTML = '';
        timelineStopButtons = [];
        DOM.timelineStops.onmouseleave = clearLocationFocus;

        const locationsDescending = locationData
            .map((location, index) => ({ location, index }))
            .reverse();

        locationsDescending.forEach(({ location, index }) => {
            const stopBtn = document.createElement('div');
            stopBtn.className = 'timeline-stop';
            stopBtn.setAttribute('role', 'listitem');
            stopBtn.dataset.index = String(index);
            const durationDays = DateUtils.getDurationDays(
                location.startDate,
                location.endDate || realNow,
                realNow
            );

            stopBtn.style.flex = `${Math.max(1, durationDays)} 1 0`;
            stopBtn.setAttribute('aria-label', `${index + 1}. ${location.city}`);
            stopBtn.title = `${index + 1}. ${location.city}`;

            const numberSpan = document.createElement('span');
            numberSpan.className = 'timeline-stop-number';
            numberSpan.textContent = String(index + 1);

            const citySpan = document.createElement('span');
            citySpan.className = 'timeline-stop-name';
            citySpan.textContent = location.city;

            stopBtn.appendChild(numberSpan);
            stopBtn.appendChild(citySpan);
            stopBtn.addEventListener('mouseenter', () => focusLocationFromTimeline(index));
            stopBtn.addEventListener('touchstart', () => {
                if (selectedLocationIndex === index) {
                    clearLocationFocus();
                } else {
                    focusLocationFromTimeline(index);
                }
            }, { passive: true });

            timelineStopButtons.push({ button: stopBtn, locationIndex: index });
            DOM.timelineStops.appendChild(stopBtn);
        });

        updateTimeline();
    };

    const updateTimeline = () => {
        const activeIndex = getCurrentLocationIndex();

        timelineStopButtons.forEach(({ button, locationIndex }) => {
            const location = locationData[locationIndex];
            const isActive = locationIndex === activeIndex;
            const isSelected = locationIndex === selectedLocationIndex;
            button.style.setProperty('--timeline-stop-color', getTimelineTextColor(location, currentScrollDate));
            button.classList.toggle('is-active', isActive);
            button.classList.toggle('is-selected', isSelected);
            if (isActive) {
                button.setAttribute('aria-current', 'true');
            } else {
                button.removeAttribute('aria-current');
            }
        });
    };

    const initPageWheel = () => {
        DOM.timeMachineWrapper.addEventListener('wheel', (e) => {
            if (e.target.closest('#journey-controls')) return;
            e.preventDefault();
            DOM.scrollContainer.scrollTop += e.deltaY;
        }, { passive: false });
    };

    const initKeyboardNavigation = () => {
        document.addEventListener('keydown', (e) => {
            // Skip if typing in input field
            if (e.target.matches('input, textarea, select')) return;

            // Skip if modifier keys pressed (preserve browser shortcuts)
            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                jumpToLocation(getCurrentLocationIndex() + 1, true);
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                jumpToLocation(getCurrentLocationIndex() - 1, true);
            }
        });
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
        initPageWheel();
        initKeyboardNavigation();
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
                    withProgrammaticScroll(() => {
                        DOM.scrollContainer.scrollTop = dateToScroll(savedDate);
                        currentScrollDate = savedDate;
                    });
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
                        withProgrammaticScroll(() => {
                            DOM.scrollContainer.scrollTop = dateToScroll(savedDate);
                        });
                    });
                    resizeCanvas();
                    initTimeline(); // Reinit for orientation switch
                    updateTimeline();
                });
            }, 50);
        });

        // Email obfuscation
        const emailLink = document.getElementById('email');
        if (emailLink) {
            const buildEmail = () => 'mail' + 'to' + ':' + 'ivan' + '.' + 'seredkin' + '@' + 'gmail' + '.' + 'com';
            emailLink.addEventListener('mouseover', () => { emailLink.href = buildEmail(); });
            emailLink.addEventListener('focus', () => { emailLink.href = buildEmail(); });
            emailLink.addEventListener('mouseout', () => { emailLink.href = '#'; });
            emailLink.addEventListener('blur', () => { emailLink.href = '#'; });
        }

        // Initial draw
        resizeCanvas();
    };

    // ====================================================================
    // PUBLIC API
    // ====================================================================
    return { init, resizeCanvas };
}
