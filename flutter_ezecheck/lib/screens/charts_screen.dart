import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../services/esp32_connectivity_service.dart';

class ChartsScreen extends StatefulWidget {
  const ChartsScreen({super.key});

  @override
  State<ChartsScreen> createState() => _ChartsScreenState();
}

class _ChartsScreenState extends State<ChartsScreen> {
  bool _showBarChart = false;

  @override
  Widget build(BuildContext context) {
    final esp32 = context.watch<Esp32ConnectivityService>();
    final readings = esp32.liveWindow;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Real-Time Physiological Trends',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
              ),
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: false, label: Text('Line Chart'), icon: Icon(Icons.show_chart)),
                  ButtonSegment(value: true, label: Text('Bar Chart'), icon: Icon(Icons.bar_chart)),
                ],
                selected: {_showBarChart},
                onSelectionChanged: (val) => setState(() => _showBarChart = val.first),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: SizedBox(
                height: 280,
                child: _showBarChart
                    ? BarChart(
                        BarChartData(
                          barGroups: List.generate(readings.length, (i) {
                            return BarChartGroupData(
                              x: i,
                              barRods: [
                                BarChartRodData(toY: readings[i].heartRate, color: const Color(0xFF0284C7), width: 8),
                                BarChartRodData(toY: readings[i].spo2, color: const Color(0xFF0D9488), width: 8),
                              ],
                            );
                          }),
                        ),
                      )
                    : LineChart(
                        LineChartData(
                          lineBarsData: [
                            LineChartBarData(
                              spots: List.generate(
                                readings.length,
                                (i) => FlSpot(i.toDouble(), readings[i].heartRate),
                              ),
                              isCurved: true,
                              color: const Color(0xFF0284C7),
                              barWidth: 3,
                            ),
                            LineChartBarData(
                              spots: List.generate(
                                readings.length,
                                (i) => FlSpot(i.toDouble(), readings[i].spo2),
                              ),
                              isCurved: true,
                              color: const Color(0xFF0D9488),
                              barWidth: 3,
                            ),
                          ],
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
