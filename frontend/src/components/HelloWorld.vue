<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ msg: string }>()

const count = ref(0)
</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="count++">contador: {{ count }}</button>
    <p>
      Edita
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
  </div>

  <p>
    Revisa
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
      >create-vue</a
    >, el proyecto inicial oficial de Vue + Vite
  </p>
  <p>
    Más información sobre el soporte de IDE para Vue en la
    <a
      href="https://vuejs.org/guide/scaling-up/tooling.html#ide-support"
      target="_blank"
      >guía de herramientas de Vue</a
    >.
  </p>
  <p class="read-the-docs">Haz clic en los logos de Vite y Vue para saber más</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
