const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0813' },
  scroll: { alignItems: 'center', padding: 20, paddingTop: 50 },
  title: { fontSize: 48, fontWeight: '900', color: '#00f3ff', marginBottom: 40 },
  card: { flexDirection: 'row', width: '100%', alignItems: 'center' }, // <--- Add the missing '),' here
  input: { flex: 1, backgroundColor: '#131124', color: '#fff', padding: 20, borderRadius: 15, fontSize: 18 },
  mic: { backgroundColor: '#1b1931', padding: 20, borderRadius: 15, marginLeft: 10 },
  micActive: { backgroundColor: '#ff007f' },
  icon: { fontSize: 24 },
  mainBtn: { backgroundColor: '#00f3ff', padding: 20, borderRadius: 15, marginTop: 20, width: '100%', alignItems: 'center' },
  btnText: { fontWeight: 'bold', fontSize: 18, color: '#0a0813' },
  resultBox: { marginTop: 40, alignItems: 'center' },
  result: { color: '#00f3ff', fontSize: 32, fontWeight: 'bold' }
});