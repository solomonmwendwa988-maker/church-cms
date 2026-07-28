// ============================================
// ADVANCED ANALYTICS & AI MODULE
// ============================================

const Analytics = {
    // ============================================
    // MEMBER ANALYTICS
    // ============================================

    // Get member growth data by month
    getMemberGrowth(days) {
        days = days || 365;
        const members = DB.getAll('members');
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        const monthlyData = {};
        members.forEach(function(m) {
            const date = new Date(m.joinDate);
            if (date >= startDate) {
                const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
                if (!monthlyData[key]) {
                    monthlyData[key] = { month: key, count: 0, new: 0 };
                }
                monthlyData[key].count++;
                monthlyData[key].new++;
            }
        });

        // Fill missing months
        const result = [];
        let currentDate = new Date(startDate);
        while (currentDate <= now) {
            const key = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
            if (monthlyData[key]) {
                result.push({
                    month: key,
                    count: monthlyData[key].count,
                    new: monthlyData[key].new,
                    label: currentDate.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
                });
            } else {
                result.push({
                    month: key,
                    count: 0,
                    new: 0,
                    label: currentDate.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
                });
            }
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return result;
    },

    // Calculate retention rate
    getRetentionRate() {
        const members = DB.getAll('members');
        const total = members.length;
        const active = members.filter(function(m) { return m.status === 'Active'; }).length;
        const inactive = members.filter(function(m) { return m.status === 'Inactive'; }).length;

        return {
            retentionRate: total > 0 ? Math.round((active / total) * 100) : 0,
            active: active,
            inactive: inactive,
            total: total
        };
    },

    // Get member demographics
    getDemographics() {
        const members = DB.getAll('members');
        const demographics = {
            gender: { Male: 0, Female: 0, Other: 0 },
            membershipType: {},
            status: { Active: 0, Inactive: 0, Visitor: 0 },
            ageGroups: {
                '0-18': 0,
                '19-30': 0,
                '31-45': 0,
                '46-60': 0,
                '60+': 0,
                'Unknown': 0
            },
            location: {}
        };

        const today = new Date();
        members.forEach(function(m) {
            // Gender
            if (m.gender) {
                demographics.gender[m.gender] = (demographics.gender[m.gender] || 0) + 1;
            }

            // Membership type
            if (m.membershipType) {
                demographics.membershipType[m.membershipType] = (demographics.membershipType[m.membershipType] || 0) + 1;
            }

            // Status
            if (m.status) {
                demographics.status[m.status] = (demographics.status[m.status] || 0) + 1;
            }

            // Age groups
            if (m.dateOfBirth) {
                const birthDate = new Date(m.dateOfBirth);
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                if (age <= 18) demographics.ageGroups['0-18']++;
                else if (age <= 30) demographics.ageGroups['19-30']++;
                else if (age <= 45) demographics.ageGroups['31-45']++;
                else if (age <= 60) demographics.ageGroups['46-60']++;
                else if (age > 60) demographics.ageGroups['60+']++;
            } else {
                demographics.ageGroups['Unknown']++;
            }

            // Location
            if (m.address) {
                const city = m.address.split(',').pop().trim() || 'Unknown';
                demographics.location[city] = (demographics.location[city] || 0) + 1;
            }
        });

        return demographics;
    },

    // ============================================
    // GIVING ANALYTICS
    // ============================================

    // Get giving trends
    getGivingTrends(days) {
        days = days || 365;
        const giving = DB.getAll('giving');
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        const monthlyData = {};
        giving.forEach(function(g) {
            const date = new Date(g.date);
            if (date >= startDate) {
                const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
                if (!monthlyData[key]) {
                    monthlyData[key] = { month: key, amount: 0, count: 0 };
                }
                monthlyData[key].amount += parseFloat(g.amount) || 0;
                monthlyData[key].count++;
            }
        });

        // Fill missing months
        const result = [];
        let currentDate = new Date(startDate);
        while (currentDate <= now) {
            const key = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
            if (monthlyData[key]) {
                result.push({
                    month: key,
                    amount: monthlyData[key].amount,
                    count: monthlyData[key].count,
                    average: monthlyData[key].count > 0 ? monthlyData[key].amount / monthlyData[key].count : 0,
                    label: currentDate.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
                });
            } else {
                result.push({
                    month: key,
                    amount: 0,
                    count: 0,
                    average: 0,
                    label: currentDate.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
                });
            }
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return result;
    },

    // Get giving by category
    getGivingByCategory() {
        const giving = DB.getAll('giving');
        const categories = {};
        giving.forEach(function(g) {
            const cat = g.category || 'Other';
            if (!categories[cat]) {
                categories[cat] = { amount: 0, count: 0 };
            }
            categories[cat].amount += parseFloat(g.amount) || 0;
            categories[cat].count++;
        });
        return categories;
    },

    // Get top givers
    getTopGivers(limit) {
        limit = limit || 10;
        const giving = DB.getAll('giving');
        const givers = {};
        giving.forEach(function(g) {
            const name = g.memberName || 'Anonymous';
            if (!givers[name]) {
                givers[name] = { name: name, total: 0, count: 0 };
            }
            givers[name].total += parseFloat(g.amount) || 0;
            givers[name].count++;
        });
        return Object.values(givers)
            .sort(function(a, b) { return b.total - a.total; })
            .slice(0, limit);
    },

    // Predict future giving (AI)
    predictGiving(months) {
        months = months || 3;
        const trends = this.getGivingTrends(180);
        const recent = trends.slice(-6);

        if (recent.length < 3) {
            return { prediction: 0, confidence: 'low', message: 'Insufficient data for prediction' };
        }

        // Simple linear regression
        const values = recent.map(function(r) { return r.amount; });
        const sum = values.reduce(function(a, b) { return a + b; }, 0);
        const avg = sum / values.length;

        // Calculate trend direction
        let upward = 0;
        for (let i = 1; i < values.length; i++) {
            if (values[i] > values[i-1]) upward++;
            else upward--;
        }

        // Simple prediction
        const growthRate = upward > 0 ? 0.05 : (upward < 0 ? -0.05 : 0);
        const lastValue = values[values.length - 1] || avg;
        const prediction = lastValue * (1 + growthRate * months);

        const confidence = values.length >= 6 ? 'high' : (values.length >= 3 ? 'medium' : 'low');

        return {
            prediction: Math.round(prediction),
            current: Math.round(lastValue),
            growthRate: growthRate,
            confidence: confidence,
            months: months,
            trend: upward > 0 ? 'upward' : (upward < 0 ? 'downward' : 'stable')
        };
    },

    // ============================================
    // ATTENDANCE ANALYTICS
    // ============================================

    // Get attendance trends
    getAttendanceTrends(days) {
        days = days || 90;
        const attendance = DB.getAll('attendance');
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        const weeklyData = {};
        attendance.forEach(function(a) {
            const date = new Date(a.date);
            if (date >= startDate) {
                const week = date.getFullYear() + '-W' + getWeekNumber(date);
                if (!weeklyData[week]) {
                    weeklyData[week] = { week: week, present: 0, absent: 0, late: 0, total: 0, label: 'Week ' + getWeekNumber(date) };
                }
                if (a.status === 'Present') weeklyData[week].present++;
                else if (a.status === 'Absent') weeklyData[week].absent++;
                else if (a.status === 'Late') weeklyData[week].late++;
                weeklyData[week].total++;
            }
        });

        return Object.values(weeklyData);
    },

    // Get attendance rate
    getAttendanceRate() {
        const attendance = DB.getAll('attendance');
        const total = attendance.length;
        const present = attendance.filter(function(a) { return a.status === 'Present'; }).length;
        const absent = attendance.filter(function(a) { return a.status === 'Absent'; }).length;
        const late = attendance.filter(function(a) { return a.status === 'Late'; }).length;

        return {
            rate: total > 0 ? Math.round((present / total) * 100) : 0,
            present: present,
            absent: absent,
            late: late,
            total: total
        };
    },

    // ============================================
    // AI PREDICTIONS & INSIGHTS
    // ============================================

    // Get AI insights
    getAIInsights() {
        const insights = [];

        // 1. Member Growth Insight
        const memberGrowth = this.getMemberGrowth(90);
        const recentGrowth = memberGrowth.slice(-3);
        const growthTrend = recentGrowth.reduce(function(sum, r) { return sum + r.new; }, 0);
        if (growthTrend > 0) {
            insights.push({
                type: 'growth',
                icon: 'fa-arrow-up',
                color: 'var(--success)',
                title: 'Member Growth Positive',
                description: growthTrend + ' new members in the last 3 months',
                recommendation: 'Continue outreach programs to maintain growth'
            });
        } else if (growthTrend === 0) {
            insights.push({
                type: 'growth',
                icon: 'fa-minus',
                color: 'var(--warning)',
                title: 'Member Growth Stagnant',
                description: 'No new members in the last 3 months',
                recommendation: 'Consider launching a membership drive or outreach event'
            });
        } else {
            insights.push({
                type: 'growth',
                icon: 'fa-arrow-down',
                color: 'var(--danger)',
                title: 'Member Decline Detected',
                description: 'Membership is declining',
                recommendation: 'Investigate reasons and implement retention strategies'
            });
        }

        // 2. Giving Insight
        const givingTrend = this.getGivingTrends(90);
        const recentGiving = givingTrend.slice(-3);
        const givingTotal = recentGiving.reduce(function(sum, r) { return sum + r.amount; }, 0);
        const avgGiving = recentGiving.length > 0 ? givingTotal / recentGiving.length : 0;

        if (avgGiving > 0) {
            insights.push({
                type: 'giving',
                icon: 'fa-coins',
                color: 'var(--success)',
                title: 'Giving Analysis',
                description: 'Average monthly giving: ' + formatCurrency(avgGiving),
                recommendation: 'Consider thanking top givers personally'
            });
        }

        // 3. Attendance Insight
        const attendanceRate = this.getAttendanceRate();
        if (attendanceRate.rate > 70) {
            insights.push({
                type: 'attendance',
                icon: 'fa-check-circle',
                color: 'var(--success)',
                title: 'Strong Attendance',
                description: attendanceRate.rate + '% attendance rate',
                recommendation: 'Continue current programs that are engaging members'
            });
        } else if (attendanceRate.rate > 50) {
            insights.push({
                type: 'attendance',
                icon: 'fa-clock',
                color: 'var(--warning)',
                title: 'Moderate Attendance',
                description: attendanceRate.rate + '% attendance rate',
                recommendation: 'Consider improving communication and engagement'
            });
        } else {
            insights.push({
                type: 'attendance',
                icon: 'fa-exclamation-triangle',
                color: 'var(--danger)',
                title: 'Low Attendance Alert',
                description: attendanceRate.rate + '% attendance rate',
                recommendation: 'Urgent: Investigate attendance drop and implement solutions'
            });
        }

        // 4. Member Churn Risk Prediction (AI)
        const churnRisk = this.predictChurnRisk();
        if (churnRisk > 20) {
            insights.push({
                type: 'churn',
                icon: 'fa-users-slash',
                color: 'var(--danger)',
                title: 'Member Churn Risk',
                description: churnRisk + '% members at risk of leaving',
                recommendation: 'Reach out to inactive members personally'
            });
        }

        // 5. Upcoming Giving Forecast
        const forecast = this.predictGiving(3);
        if (forecast.prediction > 0) {
            insights.push({
                type: 'forecast',
                icon: 'fa-chart-line',
                color: 'var(--primary)',
                title: 'Giving Forecast',
                description: 'Predicted giving for next 3 months: ' + formatCurrency(forecast.prediction),
                recommendation: forecast.trend === 'upward' ? 'Prepare for increased giving' : 'Plan budget accordingly'
            });
        }

        // 6. Demographic Insight
        const demographics = this.getDemographics();
        const topLocation = Object.entries(demographics.location)
            .sort(function(a, b) { return b[1] - a[1]; })[0];
        if (topLocation && topLocation[1] > 0) {
            insights.push({
                type: 'demographic',
                icon: 'fa-map-marker-alt',
                color: 'var(--info)',
                title: 'Member Location',
                description: 'Most members from: ' + topLocation[0] + ' (' + topLocation[1] + ' members)',
                recommendation: 'Consider outreach in underrepresented areas'
            });
        }

        return insights;
    },

    // Predict member churn risk
    predictChurnRisk() {
        const members = DB.getAll('members');
        const attendance = DB.getAll('attendance');
        const giving = DB.getAll('giving');

        // Identify inactive members (no attendance in 60 days)
        const now = new Date();
        const sixtyDaysAgo = new Date(now);
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        let atRisk = 0;
        members.forEach(function(m) {
            if (m.status === 'Inactive') {
                atRisk++;
                return;
            }

            // Check if member has attended recently
            const attended = attendance.some(function(a) {
                return a.memberId === m.id && new Date(a.date) >= sixtyDaysAgo;
            });

            // Check if member has given recently
            const gave = giving.some(function(g) {
                return g.memberId === m.id && new Date(g.date) >= sixtyDaysAgo;
            });

            if (!attended && !gave && m.status === 'Active') {
                atRisk++;
            }
        });

        return members.length > 0 ? Math.round((atRisk / members.length) * 100) : 0;
    },

    // ============================================
    // CHART DATA GENERATORS
    // ============================================

    // Get chart data for member growth
    getMemberGrowthChartData(days) {
        days = days || 365;
        const data = this.getMemberGrowth(days);
        return {
            labels: data.map(function(d) { return d.label; }),
            datasets: {
                members: data.map(function(d) { return d.count; }),
                new: data.map(function(d) { return d.new; })
            }
        };
    },

    // Get chart data for giving trends
    getGivingChartData(days) {
        days = days || 365;
        const data = this.getGivingTrends(days);
        return {
            labels: data.map(function(d) { return d.label; }),
            datasets: {
                amount: data.map(function(d) { return d.amount; }),
                count: data.map(function(d) { return d.count; }),
                average: data.map(function(d) { return d.average; })
            }
        };
    },

    // Get chart data for attendance
    getAttendanceChartData(days) {
        days = days || 90;
        const data = this.getAttendanceTrends(days);
        return {
            labels: data.map(function(d) { return d.label; }),
            datasets: {
                present: data.map(function(d) { return d.present; }),
                absent: data.map(function(d) { return d.absent; }),
                late: data.map(function(d) { return d.late; })
            }
        };
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}